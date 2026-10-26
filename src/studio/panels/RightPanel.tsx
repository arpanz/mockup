import { useMemo, useRef, useState, type ReactElement, type RefObject } from 'react';
import {
  ChevronsRight, Circle, Copy, Eye, EyeOff, Image as ImageIcon, Link2, Lock, LockOpen, MoreHorizontal, Palette, Plus, Smartphone, Sparkles, Square, Star, Tag, Type, Unlink2,
} from 'lucide-react';
import { openContextMenu } from '../editor/ContextMenu';
import { elementMenu, slideMenu } from '../editor/menus';
import { createDevice, createImage, createShape, createText } from '../model/defaults';
import type { StudioElement } from '../model/types';
import { hasOverride } from '../model/units';
import { useEditor } from '../store/editorStore';
import { readImageFile } from '../store/persistence';
import { DocumentColorsProvider, Menu, Popover, Toggle, Tooltip, usePopover } from '../ui';
import { DeviceInspector } from './inspector/DeviceInspector';
import { ImageInspector, MultiInspector, ShapeInspector } from './inspector/ElementInspectors';
import { SlideInspector } from './inspector/SlideInspector';
import { TextInspector } from './inspector/TextInspector';
import { StickerPicker } from '../stickers/StickerPicker';
import { useSelected, useUiPrefs } from './useSelected';

/** Most-used colors in the document, for picker swatches. */
function useDocumentColors() {
  const slides = useEditor((state) => state.project.slides);
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const match of JSON.stringify(slides).matchAll(/"#([\da-fA-F]{6}(?:[\da-fA-F]{2})?)"/g)) {
      const hex = `#${match[1].toUpperCase()}`;
      counts.set(hex, (counts.get(hex) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([hex]) => hex).slice(0, 16);
  }, [slides]);
}

const ICONS: Record<StudioElement['type'], typeof Type> = { text: Type, device: Smartphone, image: ImageIcon, shape: Square };

function AddLayerMenu({ slideId }: { slideId: string }) {
  const popover = usePopover();
  const stickers = usePopover();
  const imageInput = useRef<HTMLInputElement>(null);
  const add = (element: StudioElement) => useEditor.getState().addElement(slideId, element);
  return (
    <>
      <Tooltip content="Add layer">
        <button
          ref={popover.anchorRef as RefObject<HTMLButtonElement>}
          type="button"
          aria-label="Add layer"
          onClick={popover.toggle}
          className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-zinc-100"
        >
          <Plus size={15} />
        </button>
      </Tooltip>
      <Popover open={popover.open} onOpenChange={popover.setOpen} anchor={popover.anchorRef} side="bottom" align="end">
        <Menu
          items={[
            { type: 'label', label: 'Text' },
            { label: 'Title', icon: <Type size={14} />, onSelect: () => add(createText('title', { text: 'New *headline*', y: 0.14 })) },
            { label: 'Subtitle', icon: <Type size={14} />, onSelect: () => add(createText('subtitle', { y: 0.22 })) },
            { label: 'Badge', icon: <Tag size={14} />, onSelect: () => add(createText('badge', { text: 'New', y: 0.06 })) },
            { type: 'separator' },
            { type: 'label', label: 'Media' },
            { label: 'Device', icon: <Smartphone size={14} />, onSelect: () => add(createDevice({ x: 0.5, y: 0.62, h: 0.6 })) },
            { label: 'Image or logo…', icon: <ImageIcon size={14} />, onSelect: () => imageInput.current?.click() },
            { type: 'separator' },
            { type: 'label', label: 'Shapes' },
            { label: 'Rectangle', icon: <Square size={14} />, onSelect: () => add(createShape('rect')) },
            { label: 'Circle', icon: <Circle size={14} />, onSelect: () => add(createShape('ellipse', { fill: { kind: 'solid', color: '#FDE68A' } })) },
            { label: 'Star', icon: <Star size={14} />, onSelect: () => add(createShape('star', { fill: { kind: 'solid', color: '#FBBF24' } })) },
            { label: 'Glow', icon: <Palette size={14} />, onSelect: () => add(createShape('ellipse', { name: 'Glow', w: 700, h: 700, blur: 160, fill: { kind: 'solid', color: '#A5B4FC' } })) },
            { label: 'Sticker…', icon: <Sparkles size={14} />, onSelect: () => { popover.setOpen(false); stickers.setOpen(true); } },
          ]}
        />
      </Popover>
      <Popover open={stickers.open} onOpenChange={stickers.setOpen} anchor={popover.anchorRef} side="bottom" align="end" className="p-0">
        <StickerPicker slideId={slideId} onDone={() => stickers.setOpen(false)} />
      </Popover>
      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          const image = await readImageFile(file);
          const assetId = useEditor.getState().addAsset({ name: file.name, ...image });
          const longest = Math.max(image.width, image.height);
          const scale = 220 / longest;
          add(createImage(assetId, Math.round(image.width * scale), Math.round(image.height * scale), { name: file.name.replace(/\.[^.]+$/, '') || 'Image', radius: 40 }));
        }}
      />
    </>
  );
}

function LayerRow({ element, slideId, outputId, selected, overridden }: { element: StudioElement; slideId: string; outputId: string; selected: boolean; overridden: boolean }) {
  const [renaming, setRenaming] = useState(false);
  const store = useEditor.getState;
  const Icon = ICONS[element.type];
  const hovered = useEditor((state) => state.hoverElementId === element.id);

  return (
    <div
      draggable={!renaming}
      onDragStart={(event) => {
        event.dataTransfer.setData('application/x-frameflow-layer', element.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('application/x-frameflow-layer')) event.preventDefault();
      }}
      onDrop={(event) => {
        const id = event.dataTransfer.getData('application/x-frameflow-layer');
        if (!id || id === element.id) return;
        event.preventDefault();
        const slide = store().project.slides.find((item) => item.id === slideId);
        const target = slide?.elements.findIndex((item) => item.id === element.id) ?? -1;
        if (target >= 0) store().moveElementToIndex(slideId, id, target);
      }}
      onPointerEnter={() => store().setHover(element.id)}
      onPointerLeave={() => store().setHover(null)}
      onClick={(event) => store().selectElement(slideId, element.id, outputId, event.shiftKey || event.metaKey)}
      onDoubleClick={() => setRenaming(true)}
      onContextMenu={(event) => {
        event.preventDefault();
        if (!selected) store().selectElement(slideId, element.id, outputId);
        openContextMenu(event.clientX, event.clientY, elementMenu(slideId, element.id, outputId));
      }}
      className={`group flex h-8 cursor-default items-center gap-2 rounded-md px-2 text-[12.5px] transition-colors ${selected
        ? 'bg-indigo-500/[0.18] text-white'
        : hovered ? 'bg-white/[0.05] text-zinc-100' : 'text-zinc-300 hover:bg-white/[0.04]'}`}
    >
      <Icon size={14} className={selected ? 'text-indigo-300' : 'text-zinc-500'} />
      {renaming ? (
        <input
          autoFocus
          defaultValue={element.name}
          onClick={(event) => event.stopPropagation()}
          onBlur={(event) => {
            store().updateElements(slideId, [element.id], { name: event.target.value.trim() || element.name });
            setRenaming(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
            if (event.key === 'Escape') setRenaming(false);
          }}
          className="h-6 min-w-0 flex-1 rounded bg-black/30 px-1.5 text-[12.5px] text-white outline-none ring-1 ring-indigo-400"
        />
      ) : (
        <span className={`min-w-0 flex-1 truncate ${element.visible ? '' : 'opacity-40'}`}>{element.name}</span>
      )}
      {overridden && (
        <Tooltip content="Customized for this size">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
        </Tooltip>
      )}
      <button
        type="button"
        aria-label={element.locked ? 'Unlock' : 'Lock'}
        onClick={(event) => {
          event.stopPropagation();
          store().updateElements(slideId, [element.id], { locked: !element.locked });
        }}
        className={`rounded p-0.5 text-zinc-500 hover:text-zinc-100 ${element.locked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
      >
        {element.locked ? <Lock size={13} /> : <LockOpen size={13} />}
      </button>
      <button
        type="button"
        aria-label={element.visible ? 'Hide' : 'Show'}
        onClick={(event) => {
          event.stopPropagation();
          store().updateElements(slideId, [element.id], { visible: !element.visible });
        }}
        className={`rounded p-0.5 text-zinc-500 hover:text-zinc-100 ${element.visible ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}
      >
        {element.visible ? <Eye size={13} /> : <EyeOff size={13} />}
      </button>
      <button
        type="button"
        aria-label={`${element.name} options`}
        onClick={(event) => {
          event.stopPropagation();
          if (!selected) store().selectElement(slideId, element.id, outputId);
          const rect = event.currentTarget.getBoundingClientRect();
          openContextMenu(rect.left, rect.bottom + 4, elementMenu(slideId, element.id, outputId));
        }}
        className="rounded p-0.5 text-zinc-500 opacity-0 hover:text-zinc-100 focus-visible:opacity-100 group-hover:opacity-100"
      >
        <MoreHorizontal size={13} />
      </button>
    </div>
  );
}

export function RightPanel({ onCollapse }: { onCollapse: () => void }) {
  const { slide, output, elements, update, overrideOutputId } = useSelected();
  const selectedIds = useEditor((state) => state.selection.elementIds);
  const groupSize = useEditor((state) => state.selection.slideIds.length);
  const multipleOutputs = useEditor((state) => state.project.outputs.length > 1);
  const syncStyles = useUiPrefs((state) => state.syncStyles);
  const setSyncStyles = useUiPrefs((state) => state.setSyncStyles);
  const documentColors = useDocumentColors();
  if (!slide || !output) return null;

  const store = useEditor.getState;
  const primary = elements[0];
  const single = elements.length === 1 ? primary : null;
  const overriding = overrideOutputId === output.id;

  let inspector: ReactElement;
  if (elements.length > 1) inspector = <MultiInspector elements={elements} output={output} update={update} />;
  else if (single?.type === 'text') inspector = <TextInspector element={single} output={output} update={update} />;
  else if (single?.type === 'device') inspector = <DeviceInspector element={single} output={output} update={update} slideId={slide.id} />;
  else if (single?.type === 'image') inspector = <ImageInspector element={single} output={output} update={update} />;
  else if (single?.type === 'shape') inspector = <ShapeInspector element={single} output={output} update={update} />;
  else inspector = <SlideInspector slide={slide} output={output} />;

  return (
    <DocumentColorsProvider colors={documentColors}>
    <aside className="absolute bottom-4 right-4 top-4 z-30 max-[1040px]:top-[72px] flex w-[320px] flex-col gap-2.5">
      <div className="flex max-h-[38%] shrink-0 flex-col rounded-2xl border border-white/[0.08] bg-zinc-900/95 shadow-[0_16px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl">
        <div className="flex items-center gap-1.5 px-3 pb-1.5 pt-2.5">
          <button
            type="button"
            onClick={() => store().select({ elementIds: [] })}
            className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left text-[13px] font-semibold transition-colors ${selectedIds.length === 0 ? 'text-white' : 'text-zinc-300 hover:text-white'}`}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${selectedIds.length === 0 ? 'bg-indigo-400' : 'bg-zinc-600'}`} />
            <span className="truncate">{slide.name}</span>
          </button>
          <AddLayerMenu slideId={slide.id} />
          <Tooltip content="Screenshot options">
            <button
              type="button"
              aria-label="Screenshot options"
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                openContextMenu(rect.left, rect.bottom + 4, slideMenu(slide.id, output.id));
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-white/[0.08] hover:text-zinc-100"
            >
              <MoreHorizontal size={15} />
            </button>
          </Tooltip>
          <Tooltip content="Hide panel">
            <button type="button" aria-label="Hide panel" onClick={onCollapse} className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-white/[0.08] hover:text-zinc-100">
              <ChevronsRight size={15} />
            </button>
          </Tooltip>
        </div>
        <div data-scrollable className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5">
          {[...slide.elements].reverse().map((element) => (
            <LayerRow
              key={element.id}
              element={element}
              slideId={slide.id}
              outputId={output.id}
              selected={selectedIds.includes(element.id)}
              overridden={hasOverride(slide, element.id, output.id)}
            />
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-900/95 shadow-[0_16px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl">
        {groupSize > 1 && (
          <div className="ff-fade flex items-center gap-2 border-b border-indigo-400/20 bg-indigo-500/[0.12] px-3 py-2 text-[12px] text-indigo-100">
            <Copy size={13} className="shrink-0 text-indigo-300" />
            <span className="min-w-0 flex-1 leading-snug">
              <b className="font-semibold">{groupSize} screenshots</b> selected
              <span className="block text-[11px] text-indigo-200/70">{primary ? `Edits to this ${primary.type === 'device' ? 'phone' : 'layer'} reach the matching one on each.` : 'Background and layout changes apply to all of them.'}</span>
            </span>
            <button type="button" onClick={() => store().select({ slideIds: [] })} className="shrink-0 rounded-md bg-white/10 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/15">Done</button>
          </div>
        )}
        {(multipleOutputs || primary) && (
          <div className="flex flex-col gap-1.5 border-b border-white/[0.06] px-3 py-2.5">
            {multipleOutputs && (
              <div className="flex items-center gap-1 rounded-lg bg-black/25 p-0.5 text-[12px]">
                <button
                  type="button"
                  onClick={() => store().setOverrideOutput(null)}
                  className={`flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md font-medium transition-colors ${!overriding ? 'bg-white/[0.1] text-white' : 'text-zinc-400 hover:text-zinc-100'}`}
                >
                  <Link2 size={13} /> All sizes
                </button>
                <button
                  type="button"
                  onClick={() => store().setOverrideOutput(output.id)}
                  className={`flex h-7 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md font-medium transition-colors ${overriding ? 'bg-amber-400/20 text-amber-100' : 'text-zinc-400 hover:text-zinc-100'}`}
                >
                  <Unlink2 size={13} /> <span className="truncate">Only {output.label}</span>
                </button>
              </div>
            )}
            {primary && !overriding && groupSize < 2 && (
              <label className="flex items-center justify-between text-[12px] text-zinc-400">
                <span>Sync style across screenshots</span>
                <Toggle checked={syncStyles} onChange={setSyncStyles} />
              </label>
            )}
            {overriding && single && hasOverride(slide, single.id, output.id) && (
              <button type="button" onClick={() => store().clearOverrides(slide.id, output.id, single.id)} className="self-start text-[12px] font-medium text-amber-200 hover:text-white">
                Reset {single.name} to shared design
              </button>
            )}
          </div>
        )}
        <div data-scrollable className="min-h-0 flex-1 overflow-y-auto pb-6">
          {inspector}
        </div>
      </div>
    </aside>
    </DocumentColorsProvider>
  );
}
