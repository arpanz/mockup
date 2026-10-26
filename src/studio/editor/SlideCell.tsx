import { memo, useMemo, useRef, useState, type DragEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { Draft } from 'immer';
import type { OutputSpec, Project, Slide, StudioElement } from '../model/types';
import { baseUnit, resolveElement, resolveElements } from '../model/units';
import { SlideRenderer } from '../render/SlideRenderer';
import { readImageFile } from '../store/persistence';
import { useEditor } from '../store/editorStore';
import { openContextMenu } from './ContextMenu';
import { elementMenu, slideMenu } from './menus';
import { SelectionOverlay, measureElement } from './SelectionOverlay';
import { TextEditorOverlay } from './TextEditorOverlay';
import { resizeBox, snapAngle, snapMove, type Box, type Guide, type Handle } from './transforms';

interface SlideCellProps {
  project: Project;
  slide: Slide;
  slideIndex: number;
  output: OutputSpec;
  scale: number;
  interactive: boolean;
}

type DragState =
  | { kind: 'move'; pointerId: number; startX: number; startY: number; starts: Record<string, { x: number; y: number }>; primary: string; moved: boolean }
  | { kind: 'resize'; pointerId: number; id: string; handle: Handle; start: Box; element: StudioElement; rect: DOMRect }
  | { kind: 'rotate'; pointerId: number; id: string; center: { x: number; y: number }; rect: DOMRect };

const imageFiles = (files: FileList | null | undefined) => Array.from(files ?? []).filter((file) => file.type.startsWith('image/'));

async function readAssets(files: File[]) {
  const results = await Promise.allSettled(files.map(async (file) => ({ name: file.name, ...(await readImageFile(file)) })));
  return results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
}

function SlideCellImpl({ project, slide, slideIndex, output, scale, interactive }: SlideCellProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingDeviceRef = useRef<string | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const downElementRef = useRef<string | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [dropHover, setDropHover] = useState(false);

  const selection = useEditor((state) => state.selection);
  const hoverElementId = useEditor((state) => state.hoverElementId);
  const editingTextId = useEditor((state) => state.editingTextId);
  const actions = useEditor.getState;

  const W = output.width;
  const H = output.height;
  const isActiveCell = selection.slideId === slide.id && selection.outputId === output.id;
  const isActiveColumn = selection.slideId === slide.id;
  const resolved = resolveElements(slide, output.id);
  const selected = isActiveCell ? resolved.filter((element) => selection.elementIds.includes(element.id)) : [];
  const hovered = isActiveColumn ? resolved.find((element) => element.id === hoverElementId) ?? null : null;
  const editing = isActiveCell ? resolved.find((element) => element.id === editingTextId && element.type === 'text') : undefined;

  // Paint the slide near its on-screen resolution rather than at full export size scaled down: a 2868px-tall
  // slide (with 3D device layers) per cell exhausts GPU memory and shows as grey tiles. Power-of-two steps
  // keep zooming from re-rendering every frame.
  const renderScale = Math.min(1, 2 ** Math.ceil(Math.log2(Math.max(scale * (window.devicePixelRatio || 1), 1 / 64))));
  const renderOutput = useMemo(
    () => (renderScale === 1 ? output : { ...output, width: output.width * renderScale, height: output.height * renderScale }),
    [output, renderScale],
  );

  const toCanvas = (clientX: number, clientY: number, rect: DOMRect) => ({ x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale });

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive || event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-text-editor]')) return;
    event.stopPropagation();
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const store = actions();

    const handle = target.closest<HTMLElement>('[data-handle]')?.dataset.handle as Handle | undefined;
    const rotate = target.closest('[data-rotate]');
    const primary = selected[0];
    if ((handle || rotate) && primary) {
      const measured = measureElement(root, primary.id);
      if (!measured) return;
      root.setPointerCapture(event.pointerId);
      if (handle) {
        dragRef.current = {
          kind: 'resize', pointerId: event.pointerId, id: primary.id, handle, rect, element: primary,
          start: { cx: primary.x * W, cy: primary.y * H, w: measured.w, h: measured.h },
        };
      } else {
        dragRef.current = { kind: 'rotate', pointerId: event.pointerId, id: primary.id, center: { x: primary.x * W, y: primary.y * H }, rect };
      }
      return;
    }

    const elementId = target.closest<HTMLElement>('[data-element-id]')?.dataset.elementId;
    // Pointer capture retargets the following dblclick to the cell root; remember what was hit.
    downElementRef.current = elementId ?? null;
    if (!elementId) {
      store.selectSlide(slide.id, output.id);
      return;
    }
    const element = resolved.find((item) => item.id === elementId);
    if (!element) return;

    const alreadySelected = isActiveCell && selection.elementIds.includes(elementId);
    if (event.shiftKey || !alreadySelected) store.selectElement(slide.id, elementId, output.id, event.shiftKey);
    if (element.locked || event.shiftKey) return;

    const moving = alreadySelected ? selection.elementIds : [elementId];
    const starts: Record<string, { x: number; y: number }> = {};
    for (const id of moving) {
      const item = resolved.find((candidate) => candidate.id === id);
      if (item && !item.locked) starts[id] = { x: item.x, y: item.y };
    }
    root.setPointerCapture(event.pointerId);
    dragRef.current = { kind: 'move', pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, starts, primary: elementId, moved: false };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const store = actions();

    if (drag.kind === 'move') {
      let dx = (event.clientX - drag.startX) / scale;
      let dy = (event.clientY - drag.startY) / scale;
      if (!drag.moved && Math.hypot(dx * scale, dy * scale) < 3) return;
      drag.moved = true;
      if (event.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0;
        else dx = 0;
      }
      const start = drag.starts[drag.primary];
      const measured = measureElement(rootRef.current, drag.primary);
      let nextGuides: Guide[] = [];
      if (start && measured && !event.altKey) {
        const others: Box[] = [];
        for (const element of resolved) {
          if (drag.starts[element.id] || !element.visible) continue;
          const box = measureElement(rootRef.current, element.id);
          if (box) others.push({ cx: element.x * W, cy: element.y * H, w: box.w, h: box.h });
        }
        const snap = snapMove(
          { cx: start.x * W + dx, cy: start.y * H + dy, w: measured.w, h: measured.h },
          others,
          { w: W, h: H },
          7 / scale,
        );
        dx += snap.dx;
        dy += snap.dy;
        nextGuides = snap.guides;
      }
      setGuides(nextGuides);
      store.updateElements(slide.id, Object.keys(drag.starts), (element: Draft<StudioElement>) => {
        const origin = drag.starts[element.id];
        if (!origin) return;
        element.x = origin.x + dx / W;
        element.y = origin.y + dy / H;
      }, { coalesce: `move-${slide.id}` });
      return;
    }

    const pointer = toCanvas(event.clientX, event.clientY, drag.rect);

    if (drag.kind === 'rotate') {
      const degrees = (Math.atan2(pointer.y - drag.center.y, pointer.x - drag.center.x) * 180) / Math.PI + 90;
      const rotation = snapAngle(degrees, event.shiftKey);
      store.updateElements(slide.id, [drag.id], { rotation: rotation > 180 ? rotation - 360 : rotation }, { coalesce: `rotate-${drag.id}` });
      return;
    }

    const { element, start } = drag;
    const unit = baseUnit(W, H);
    const result = resizeBox(start, drag.handle, pointer, event.altKey, element.rotation % 360 !== 0);
    store.updateElements(slide.id, [drag.id], (draft: Draft<StudioElement>) => {
      draft.x = result.center.x / W;
      draft.y = result.center.y / H;
      if (result.kind === 'uniform') {
        const s = result.scale;
        if (draft.type === 'text' && element.type === 'text') {
          draft.fontSize = Math.max(4, element.fontSize * s);
          draft.w = Math.max(0.05, element.w * s);
        } else if (draft.type === 'device' && element.type === 'device') {
          draft.h = Math.max(0.05, element.h * s);
        } else if ((draft.type === 'image' || draft.type === 'shape') && (element.type === 'image' || element.type === 'shape')) {
          draft.w = Math.max(4, element.w * s);
          draft.h = Math.max(4, element.h * s);
        }
      } else if (result.kind === 'width') {
        if (draft.type === 'text') draft.w = Math.max(0.05, result.size / W);
        else if (draft.type === 'image' || draft.type === 'shape') draft.w = Math.max(4, result.size / unit);
      } else if (draft.type === 'image' || draft.type === 'shape') {
        draft.h = Math.max(4, result.size / unit);
      }
    }, { coalesce: `resize-${drag.id}` });
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setGuides([]);
    // Next edit starts a fresh undo step.
    useEditor.setState({ lastCoalesce: null });
  };

  const handleDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const elementId = (event.target as HTMLElement).closest<HTMLElement>('[data-element-id]')?.dataset.elementId ?? downElementRef.current;
    const element = resolved.find((item) => item.id === elementId);
    if (!element || element.locked) return;
    event.preventDefault();
    if (element.type === 'text') {
      actions().selectElement(slide.id, element.id, output.id);
      actions().setEditingText(element.id);
    } else if (element.type === 'device') {
      pendingDeviceRef.current = element.id;
      fileInputRef.current?.click();
    }
  };

  const assignFiles = async (files: File[], deviceId: string | null) => {
    const assets = await readAssets(files);
    if (assets.length === 0) return;
    const store = actions();
    if (deviceId && assets.length === 1) {
      const assetId = store.addAsset(assets[0]);
      store.setDeviceScreenshot(slide.id, deviceId, assetId);
      store.selectElement(slide.id, deviceId, output.id);
      return;
    }
    store.placeScreenshots(assets, slide.id);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    const files = imageFiles(event.dataTransfer.files);
    setDropHover(false);
    if (files.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    const elementId = (document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null)
      ?.closest<HTMLElement>('[data-element-id]')?.dataset.elementId;
    const device = resolved.find((element) => element.id === elementId && element.type === 'device');
    void assignFiles(files, device?.id ?? null);
  };

  return (
    <div
      ref={rootRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(event) => {
        if (!interactive || (event.target as HTMLElement).closest('[data-text-editor]')) return;
        event.preventDefault();
        const store = actions();
        const elementId = (event.target as HTMLElement).closest<HTMLElement>('[data-element-id]')?.dataset.elementId;
        if (elementId && resolved.some((element) => element.id === elementId)) {
          if (!(isActiveCell && selection.elementIds.includes(elementId))) store.selectElement(slide.id, elementId, output.id);
          openContextMenu(event.clientX, event.clientY, elementMenu(slide.id, elementId, output.id));
          return;
        }
        store.selectSlide(slide.id, output.id);
        const rect = event.currentTarget.getBoundingClientRect();
        const at = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
        openContextMenu(event.clientX, event.clientY, slideMenu(slide.id, output.id, at));
      }}
      onPointerOver={(event) => {
        if (!interactive || dragRef.current) return;
        const id = (event.target as HTMLElement).closest<HTMLElement>('[data-element-id]')?.dataset.elementId ?? null;
        if (useEditor.getState().hoverElementId !== id) actions().setHover(id);
      }}
      onPointerLeave={() => interactive && actions().setHover(null)}
      onDragOver={(event) => {
        if (!interactive || !Array.from(event.dataTransfer.items).some((item) => item.kind === 'file')) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'copy';
        setDropHover(true);
      }}
      onDragLeave={() => setDropHover(false)}
      onDrop={handleDrop}
      data-render-scale={renderScale}
      style={{ width: W * scale, height: H * scale, position: 'relative', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <div style={{ width: renderOutput.width, height: renderOutput.height, transform: `scale(${scale / renderScale})`, transformOrigin: '0 0', position: 'absolute', left: 0, top: 0 }}>
        <SlideRenderer
          project={project}
          slide={slide}
          output={renderOutput}
          slideIndex={slideIndex}
          interactive={interactive}
          hiddenElementId={editing?.id ?? null}
        />
      </div>
      <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: '0 0', position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
        {interactive && (
          <SelectionOverlay
            rootRef={rootRef}
            width={W}
            height={H}
            scale={scale}
            selected={editing ? [] : selected}
            hovered={editing ? null : hovered}
            guides={guides}
            showHandles={!editing}
          />
        )}
        {interactive && editing && editing.type === 'text' && (
          <div style={{ pointerEvents: 'auto' }}>
            <TextEditorOverlay slideId={slide.id} element={resolveElement(slide, editing, output.id)} canvasWidth={W} canvasHeight={H} />
          </div>
        )}
      </div>
      {dropHover && (
        <div className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] bg-indigo-500/15 ring-2 ring-inset ring-indigo-400" />
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const files = imageFiles(event.target.files);
          const deviceId = pendingDeviceRef.current;
          pendingDeviceRef.current = null;
          event.target.value = '';
          if (files.length) void assignFiles(files, deviceId);
        }}
      />
    </div>
  );
}

export const SlideCell = memo(SlideCellImpl);
