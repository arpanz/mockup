import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { ClipboardCopy, Copy, GripVertical, ImagePlus, MoreHorizontal, Plus, Star, Trash2, X } from 'lucide-react';
import { copySlideImage } from '../export/copySlide';
import { OUTPUT_CATALOG } from '../model/outputs';
import { useEditor } from '../store/editorStore';
import { readImageFile } from '../store/persistence';
import { Popover, usePopover } from '../ui';
import { openContextMenu } from './ContextMenu';
import { CELL_GAP, CHIP_ROW, ROW_HEADER, ROW_REFERENCE_HEIGHT, computeLayout } from './layout';
import { slideMenu } from './menus';
import { SlideCell } from './SlideCell';

const MIN_ZOOM = 0.03;
const MAX_ZOOM = 1.2;

/** Space the right panel takes when open, so fit-to-view centers in the visible area. */
export const PANEL_INSET = 352;

export function Canvas({ rightInset }: { rightInset: number }) {
  const project = useEditor((state) => state.project);
  const view = useEditor((state) => state.view);
  const mode = useEditor((state) => state.mode);
  const selection = useEditor((state) => state.selection);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const [draggedSlide, setDraggedSlide] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const panRef = useRef<{ pointerId: number; x: number; y: number; originX: number; originY: number; moved: boolean; deselect: boolean } | null>(null);
  // Drag on empty canvas draws a selection box, like a desktop; screenshots it touches are selected together.
  const marqueeRef = useRef<{ pointerId: number; x: number; y: number; additive: boolean; base: string[]; hits: string } | null>(null);
  const [marquee, setMarquee] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const group = selection.slideIds;
  const preview = mode === 'preview';
  const outputs = project.outputs;
  const layout = computeLayout(project, view.zoom, outputs);

  const zoomAround = useCallback((ratio: number, cx?: number, cy?: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const current = viewRef.current;
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.zoom * ratio));
    const x = cx ?? (rect.width - rightInset) / 2;
    const y = cy ?? rect.height / 2;
    const next = { zoom, x: x - (x - current.x) * (zoom / current.zoom), y: y - (y - current.y) * (zoom / current.zoom) };
    viewRef.current = next;
    useEditor.getState().setView(next);
  }, [rightInset]);

  const fitToView = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const state = useEditor.getState();
    const availableWidth = rect.width - rightInset - 120;
    const availableHeight = rect.height - 200;
    // Layout size is linear in zoom (cells scale, headers/gaps don't): size(z) = fixed + z * unit.
    const fixed = computeLayout(state.project, 0, state.project.outputs);
    const unit = computeLayout(state.project, 1, state.project.outputs);
    const solve = (available: number, at0: number, at1: number) => (available - at0) / Math.max(1e-6, at1 - at0);
    const widthZoom = solve(availableWidth, fixed.width, unit.width);
    const heightZoom = solve(availableHeight, fixed.height, unit.height);
    // Never shrink slides below a comfortable working size just to fit every row: the first row gets about half the
    // window (as wide as the window allows) and further sizes scroll into view.
    const readableZoom = Math.min(Math.max(220, availableHeight * 0.52) / ROW_REFERENCE_HEIGHT, Math.max(widthZoom, 220 / ROW_REFERENCE_HEIGHT));
    let zoom = Math.max(Math.min(widthZoom, heightZoom), readableZoom);
    zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    const final = computeLayout(state.project, zoom, state.project.outputs);
    const next = {
      zoom,
      x: Math.max(48, (rect.width - rightInset - final.width) / 2),
      y: Math.max(76, (rect.height - final.height) / 2 - 10),
    };
    viewRef.current = next;
    state.setView(next);
  }, [rightInset]);

  // Expose fit/zoom to the rest of the app (toolbar, shortcuts).
  useEffect(() => {
    canvasCommands.fit = fitToView;
    canvasCommands.zoomBy = (ratio: number) => zoomAround(ratio);
    canvasCommands.zoomTo = (zoom: number) => zoomAround(zoom / viewRef.current.zoom);
  }, [fitToView, zoomAround]);

  // Fit once hydrated, and when the set of rows/columns or the visible area changes shape.
  const hydrated = useEditor((state) => state.hydrated);
  const shapeKey = `${project.outputs.map((output) => output.id).join(',')}|${project.slides.length > 0}|${rightInset}`;
  useEffect(() => {
    if (hydrated) fitToView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, shapeKey]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      if ((event.target as HTMLElement).closest('[data-scrollable]')) return;
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        const rect = node.getBoundingClientRect();
        zoomAround(Math.exp(-event.deltaY * 0.0085), event.clientX - rect.left, event.clientY - rect.top);
      } else {
        const current = viewRef.current;
        const next = { ...current, x: current.x - event.deltaX, y: current.y - event.deltaY };
        viewRef.current = next;
        useEditor.getState().setView(next);
      }
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [zoomAround]);

  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      return Boolean(element?.closest('input, textarea, select, [contenteditable="true"]'));
    };
    const down = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !isTyping(event.target)) {
        event.preventDefault();
        setSpaceHeld(true);
      }
    };
    const up = (event: KeyboardEvent) => event.code === 'Space' && setSpaceHeld(false);
    const blur = () => setSpaceHeld(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  const onPointerDownCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const background = (event.target as HTMLElement).dataset.canvasBackground === 'true';
    const forcePan = event.button === 1 || (event.button === 0 && spaceHeld);
    if (!forcePan && !(event.button === 0 && background)) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointers can't be captured; panning still works.
    }
    if (!forcePan && !preview) {
      const { selection: current } = useEditor.getState();
      const additive = event.shiftKey || event.metaKey;
      const base = additive ? (current.slideIds.length ? current.slideIds : current.slideId ? [current.slideId] : []) : [];
      marqueeRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, additive, base, hits: '' };
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    panRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: view.x, originY: view.y, moved: false, deselect: !forcePan };
    setPanning(true);
  };

  const updateMarquee = (event: ReactPointerEvent<HTMLDivElement>) => {
    const box = marqueeRef.current;
    const container = containerRef.current;
    if (!box || !container) return;
    const left = Math.min(box.x, event.clientX);
    const top = Math.min(box.y, event.clientY);
    const right = Math.max(box.x, event.clientX);
    const bottom = Math.max(box.y, event.clientY);
    if (!marquee && right - left < 4 && bottom - top < 4) return;
    const origin = container.getBoundingClientRect();
    setMarquee({ left: left - origin.left, top: top - origin.top, width: right - left, height: bottom - top });
    const hits = new Set(box.base);
    let outputId: string | null = null;
    for (const cell of container.querySelectorAll<HTMLElement>('[data-slide-cell]')) {
      const rect = cell.getBoundingClientRect();
      if (rect.right < left || rect.left > right || rect.bottom < top || rect.top > bottom) continue;
      hits.add(cell.dataset.slideCell!);
      outputId ??= cell.dataset.outputId ?? null;
    }
    const key = [...hits].sort().join(',');
    if (key === box.hits) return;
    box.hits = key;
    if (hits.size) useEditor.getState().selectSlides([...hits], outputId ?? undefined);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (marqueeRef.current?.pointerId === event.pointerId) {
      updateMarquee(event);
      return;
    }
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const dx = event.clientX - pan.x;
    const dy = event.clientY - pan.y;
    if (!pan.moved && Math.hypot(dx, dy) < 3) return;
    pan.moved = true;
    const next = { ...viewRef.current, x: pan.originX + dx, y: pan.originY + dy };
    viewRef.current = next;
    useEditor.getState().setView(next);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const box = marqueeRef.current;
    if (box?.pointerId === event.pointerId) {
      marqueeRef.current = null;
      // A plain click on empty canvas lets go of everything.
      if (!marquee && !box.additive) useEditor.getState().select({ elementIds: [], slideIds: [] });
      setMarquee(null);
      return;
    }
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    panRef.current = null;
    setPanning(false);
    if (!pan.moved && pan.deselect) useEditor.getState().clearSelection();
  };

  const addScreenshots = async (files: FileList | null, afterSlideId?: string) => {
    const images = Array.from(files ?? []).filter((file) => file.type.startsWith('image/'));
    const assets = (await Promise.allSettled(images.map(async (file) => ({ name: file.name, ...(await readImageFile(file)) }))))
      .flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
    if (assets.length) useEditor.getState().placeScreenshots(assets, afterSlideId);
  };

  return (
    <div
      ref={containerRef}
      data-canvas-background="true"
      className={`studio-canvas absolute inset-0 overflow-hidden ${panning ? 'cursor-grabbing' : spaceHeld ? 'cursor-grab' : ''}`}
      onPointerDownCapture={onPointerDownCapture}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        void addScreenshots(event.dataTransfer.files);
      }}
    >
      {marquee && (
        <div
          className="pointer-events-none absolute z-40 rounded-[3px] border border-indigo-400/90 bg-indigo-500/10"
          style={{ left: marquee.left, top: marquee.top, width: marquee.width, height: marquee.height }}
        />
      )}
      <div
        data-canvas-background="true"
        className="absolute left-0 top-0"
        style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0)`, width: layout.width, height: layout.height }}
      >
        {layout.rows.map((row) => {
          const output = outputs.find((item) => item.id === row.outputId)!;
          const primary = outputs[0]?.id === output.id;
          return (
            <div key={row.outputId} className="absolute left-0 flex items-center gap-2" style={{ top: row.y, height: ROW_HEADER }}>
              <div className="flex h-7 items-center gap-2 rounded-lg bg-white/[0.04] pl-2.5 pr-1 text-xs text-zinc-300 ring-1 ring-white/[0.06]">
                {primary && <Star size={11} className="fill-amber-300/80 text-amber-300/80" />}
                <span className="font-semibold text-zinc-100">{output.label}</span>
                <span className="tabular-nums text-zinc-500">{output.width} × {output.height}</span>
                {!preview && <RowMenu outputId={output.id} primary={primary} removable={outputs.length > 1} />}
              </div>
            </div>
          );
        })}

        {layout.cells.map((cell) => {
          const slideIndex = project.slides.findIndex((slide) => slide.id === cell.slideId);
          const slide = project.slides[slideIndex];
          const output = outputs.find((item) => item.id === cell.outputId)!;
          const activeCell = selection.slideId === slide.id && selection.outputId === output.id;
          const activeColumn = selection.slideId === slide.id;
          const grouped = group.length > 1 && group.includes(slide.id);
          return (
            <div key={`${cell.outputId}-${cell.slideId}`} className="absolute" style={{ left: cell.x, top: cell.y - CHIP_ROW, width: cell.width, zIndex: activeCell ? 5 : undefined }}>
              <SlideChip
                name={slide.name}
                index={slideIndex}
                slideId={slide.id}
                outputId={output.id}
                active={(activeColumn || grouped) && !preview}
                compact={cell.width < 150}
                preview={preview}
                dragging={draggedSlide === slide.id}
                dropBefore={dropIndex === slideIndex && draggedSlide !== null}
                onDragStart={() => setDraggedSlide(slide.id)}
                onDragEnter={() => draggedSlide && setDropIndex(slideIndex)}
                onDrop={() => {
                  if (draggedSlide && dropIndex !== null) useEditor.getState().moveSlide(draggedSlide, dropIndex);
                  setDraggedSlide(null);
                  setDropIndex(null);
                }}
                onDragEnd={() => {
                  setDraggedSlide(null);
                  setDropIndex(null);
                }}
              />
              <div
                data-slide-cell={slide.id}
                data-output-id={output.id}
                className={`relative transition-shadow duration-150 ${activeCell && !preview ? 'z-10 ' : ''}${activeCell && !preview
                  ? 'shadow-[0_0_0_2px_#6366F1,0_24px_60px_-12px_rgba(0,0,0,0.6)]'
                  : grouped && !preview
                    ? 'shadow-[0_0_0_2px_rgba(129,140,248,0.55),0_24px_60px_-12px_rgba(0,0,0,0.55)]'
                    : 'shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_24px_60px_-12px_rgba(0,0,0,0.55)]'}`}
                style={{ width: cell.width, height: cell.height }}
              >
                <SlideCell project={project} slide={slide} slideIndex={slideIndex} output={output} scale={cell.scale} interactive={!preview} />
              </div>
            </div>
          );
        })}

        {!preview && layout.rows.map((row) => {
          const cell = layout.cells.filter((item) => item.outputId === row.outputId).at(-1);
          if (!cell) return null;
          return (
            <label
              key={`add-${row.outputId}`}
              className="group absolute flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[6px] border border-dashed border-white/12 text-zinc-500 transition-colors hover:border-indigo-400/70 hover:bg-indigo-500/[0.06] hover:text-indigo-200"
              style={{ left: cell.x + cell.width + CELL_GAP, top: cell.y, width: Math.max(72, cell.width * 0.42), height: cell.height }}
              title="Add screenshots (⌥S)"
            >
              <ImagePlus size={Math.max(14, Math.min(22, cell.width * 0.08))} />
              <span className="px-2 text-center text-[11px] font-medium leading-tight">Add screenshot</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => { void addScreenshots(event.target.files, project.slides.at(-1)?.id); event.target.value = ''; }} />
            </label>
          );
        })}

        {!preview && (
          <div className="absolute" style={{ left: 0, top: layout.height + 28 }}>
            <AddOutputButton />
          </div>
        )}
      </div>
    </div>
  );
}

/** Imperative handles the toolbar and keyboard shortcuts call into. */
export const canvasCommands = {
  fit: () => {},
  zoomBy: (_ratio: number) => {},
  zoomTo: (_zoom: number) => {},
};

interface SlideChipProps {
  name: string;
  index: number;
  slideId: string;
  outputId: string;
  active: boolean;
  compact: boolean;
  preview: boolean;
  dragging: boolean;
  dropBefore: boolean;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

function SlideChip({ name, index, slideId, outputId, active, compact, preview, dragging, dropBefore, onDragStart, onDragEnter, onDrop, onDragEnd }: SlideChipProps) {
  const store = useEditor.getState;
  return (
    <div
      className={`group relative flex items-center gap-1 ${dragging ? 'opacity-40' : ''}`}
      style={{ height: CHIP_ROW - 8, marginBottom: 8 }}
      draggable={!preview}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('application/x-frameflow-slide', slideId);
        onDragStart();
      }}
      onDragEnter={onDragEnter}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('application/x-frameflow-slide')) event.preventDefault();
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes('application/x-frameflow-slide')) return;
        event.preventDefault();
        event.stopPropagation();
        onDrop();
      }}
      onDragEnd={onDragEnd}
      onContextMenu={(event) => {
        if (preview) return;
        event.preventDefault();
        if (useEditor.getState().selection.slideIds.includes(slideId)) store().select({ elementIds: [], slideId, outputId });
        else store().selectSlide(slideId, outputId);
        openContextMenu(event.clientX, event.clientY, slideMenu(slideId, outputId));
      }}
    >
      {dropBefore && <div className="absolute -left-[22px] top-0 h-full w-[3px] rounded-full bg-indigo-400" />}
      <button
        type="button"
        onClick={(event) => (event.shiftKey || event.metaKey ? store().toggleSlideSelection(slideId, outputId) : store().selectSlide(slideId, outputId))}
        className={`flex h-full min-w-0 items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition-colors ${active
          ? 'bg-indigo-600 text-white'
          : 'bg-white/[0.05] text-zinc-400 hover:bg-white/10 hover:text-zinc-100'} ${preview ? 'pointer-events-none' : 'cursor-grab active:cursor-grabbing'}`}
      >
        {!compact && !preview && <GripVertical size={11} className="-ml-0.5 shrink-0 opacity-50" />}
        <span className="truncate">{compact ? index + 1 : name}</span>
      </button>
      {!preview && !compact && (
        <div className={`ml-auto flex items-center gap-0.5 transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <button type="button" title="Copy as image (⌘⇧C)" onClick={() => void copySlideImage(slideId, outputId)} className="rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-100">
            <ClipboardCopy size={12} />
          </button>
          <button type="button" title="Duplicate" onClick={() => store().duplicateSlide(slideId)} className="rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-100">
            <Copy size={12} />
          </button>
          <button type="button" title="Delete" onClick={() => store().removeSlide(slideId)} className="rounded p-1 text-zinc-500 hover:bg-red-500/15 hover:text-red-300">
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

function RowMenu({ outputId, primary, removable }: { outputId: string; primary: boolean; removable: boolean }) {
  const [open, setOpen] = useState(false);
  const store = useEditor.getState;
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!(event.target as HTMLElement).closest('[data-row-menu]')) setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);
  return (
    <div data-row-menu className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-100" title="Size options">
        <MoreHorizontal size={13} />
      </button>
      {open && (
        <div className="absolute left-0 top-7 z-50 w-48 rounded-lg border border-white/10 bg-zinc-900 p-1 text-xs shadow-2xl">
          {!primary && (
            <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-zinc-200 hover:bg-white/5" onClick={() => { store().setPrimaryOutput(outputId); setOpen(false); }}>
              <Star size={12} /> Make primary size
            </button>
          )}
          <button
            type="button"
            disabled={!removable}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-red-300 hover:bg-red-500/10 disabled:opacity-40"
            onClick={() => { store().toggleOutput(outputId); setOpen(false); }}
          >
            <X size={12} /> Remove size
          </button>
        </div>
      )}
    </div>
  );
}

const OUTPUT_PRESETS = [
  { label: 'iOS', ids: ['ios-69', 'ipad-13'], hint: 'The two sizes App Store Connect requires' },
  { label: 'Android', ids: ['play-phone', 'play-tablet-10'], hint: 'Google Play phone and tablet' },
  { label: 'Both', ids: ['ios-69', 'ipad-13', 'play-phone', 'play-tablet-10'], hint: 'Everything for both stores' },
];

function AddOutputButton() {
  // A portalled popover: this button sits at the bottom of the canvas, so the menu has to be free to open upward.
  const popover = usePopover();
  const outputs = useEditor((state) => state.project.outputs);
  const groups = [
    { store: 'app-store', label: 'App Store' },
    { store: 'play-store', label: 'Google Play' },
    { store: 'mac-app-store', label: 'Mac App Store' },
  ] as const;
  return (
    <>
      <button
        ref={popover.anchorRef as RefObject<HTMLButtonElement>}
        type="button"
        onClick={popover.toggle}
        className="flex h-8 items-center gap-2 rounded-lg border border-dashed border-white/15 px-3 text-xs font-medium text-zinc-400 transition-colors hover:border-indigo-400/70 hover:text-indigo-200"
      >
        <Plus size={13} /> Add device size
      </button>
      <Popover open={popover.open} onOpenChange={popover.setOpen} anchor={popover.anchorRef} side="top" className="max-h-[min(72vh,600px)] w-72 overflow-y-auto">
          <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Quick sets</div>
          <div className="grid grid-cols-3 gap-1 px-1 pb-1.5">
            {OUTPUT_PRESETS.map((preset) => {
              const active = preset.ids.length === outputs.length && preset.ids.every((id, index) => outputs[index]?.id === id);
              return (
                <button
                  key={preset.label}
                  type="button"
                  title={preset.hint}
                  onClick={() => useEditor.getState().setOutputs(preset.ids)}
                  className={`rounded-md px-1.5 py-1.5 text-[11px] font-medium transition-colors ${active ? 'bg-indigo-500/20 text-indigo-100 ring-1 ring-indigo-400/50' : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]'}`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <div className="mx-2 border-t border-white/[0.06]" />
          {groups.map((group) => (
            <div key={group.store} className="py-1">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{group.label}</div>
              {OUTPUT_CATALOG.filter((output) => output.store === group.store).map((output) => {
                const enabled = outputs.some((item) => item.id === output.id);
                return (
                  <button
                    key={output.id}
                    type="button"
                    onClick={() => useEditor.getState().toggleOutput(output.id)}
                    disabled={enabled && outputs.length === 1}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-zinc-200 hover:bg-white/5 disabled:opacity-40"
                  >
                    <span className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${enabled ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-white/20'}`}>
                      {enabled && <svg viewBox="0 0 12 12" className="h-2.5 w-2.5"><path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </span>
                    <span className="flex-1">{output.label}</span>
                    {output.required && <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">Required</span>}
                    <span className="tabular-nums text-zinc-500">{output.width}×{output.height}</span>
                  </button>
                );
              })}
            </div>
          ))}
      </Popover>
    </>
  );
}
