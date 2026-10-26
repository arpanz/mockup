import {
  ArrowDown, ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUp, ArrowUpToLine, ClipboardCopy, ClipboardPaste, CopyPlus, Crosshair,
  Eye, EyeOff, ImageOff, ImagePlus, Layers, Lock, LockOpen, Move, PaintBucket, Paintbrush, Plus, Smartphone, Trash2, Type, Wand,
} from 'lucide-react';
import { copySlideImage } from '../export/copySlide';
import { createDevice, createText } from '../model/defaults';
import {
  canPaste, counterpart, kindLabel, pasteSlideStyle, pasteStyle, slideStyleOf, styleOf, useStyleClipboard,
} from '../model/styleClipboard';
import type { Slide, StudioElement } from '../model/types';
import { resolveElement } from '../model/units';
import { useEditor } from '../store/editorStore';
import { readImageFile } from '../store/persistence';
import type { ContextMenuItem } from './ContextMenu';
import { notify } from './notify';

const store = useEditor.getState;
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const plural = (count: number) => `${count} screenshot${count === 1 ? '' : 's'}`;
const undoAction = { label: 'Undo', onClick: () => store().undo() };

function find(slideId: string, elementId?: string): { slide?: Slide; element?: StudioElement } {
  const slide = store().project.slides.find((item) => item.id === slideId);
  return { slide, element: elementId ? slide?.elements.find((item) => item.id === elementId) : undefined };
}

function pickImage(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

/* ───────────── element style ───────────── */

export function copyElementStyle(slideId: string, elementId: string, outputId: string | null) {
  const { slide, element } = find(slideId, elementId);
  if (!slide || !element) return;
  const style = styleOf(resolveElement(slide, element, outputId));
  useStyleClipboard.setState({ element: style });
  notify({ title: `${capitalize(style.label)} style copied`, description: 'Paste it onto another element with ⌥⇧V.', tone: 'info' });
}

export function pasteElementStyle(slideId: string, ids: string[]) {
  const style = useStyleClipboard.getState().element;
  if (!style) return;
  let pasted = 0;
  store().commit((draft) => {
    const slide = draft.slides.find((item) => item.id === slideId);
    for (const element of slide?.elements ?? []) {
      if (!ids.includes(element.id) || element.type !== style.type) continue;
      pasteStyle(element, style);
      pasted++;
    }
  });
  if (!pasted) notify({ title: `That’s a ${style.label} style`, description: `Select a ${style.label} to paste it onto.`, tone: 'info' });
}

function applyStyleToAll(slideId: string, elementId: string, outputId: string | null) {
  const { slide, element } = find(slideId, elementId);
  if (!slide || !element) return;
  const style = styleOf(resolveElement(slide, element, outputId));
  let count = 0;
  store().commit((draft) => {
    for (const other of draft.slides) {
      if (other.id === slideId) continue;
      const match = counterpart(slide, element, other);
      if (match) { pasteStyle(match, style); count++; }
    }
  });
  notify({ title: count ? `${capitalize(style.label)} style applied to ${plural(count)}` : `No other screenshot has a ${style.label}`, tone: count ? 'success' : 'info', action: count ? undoAction : undefined });
}

function samePositionOnAll(slideId: string, elementId: string, outputId: string | null) {
  const { slide, element } = find(slideId, elementId);
  if (!slide || !element) return;
  const { x, y } = resolveElement(slide, element, outputId);
  let count = 0;
  store().commit((draft) => {
    for (const other of draft.slides) {
      if (other.id === slideId) continue;
      const match = counterpart(slide, element, other);
      if (match) { match.x = x; match.y = y; count++; }
    }
  });
  if (count) notify({ title: `Moved to the same spot on ${plural(count)}`, tone: 'success', action: undoAction });
}

/* ───────────── screenshot style ───────────── */

export function copySlideStyle(slideId: string, outputId: string | null) {
  const { slide } = find(slideId);
  if (!slide) return;
  useStyleClipboard.setState({ slide: slideStyleOf(slide, (element) => resolveElement(slide, element, outputId)) });
  notify({ title: 'Screenshot style copied', description: 'Background and every element’s look. Paste with ⌥⇧V.', tone: 'info' });
}

export function pasteSlideStyleTo(slideIds: string[]) {
  const style = useStyleClipboard.getState().slide;
  if (!style) return;
  store().commit((draft) => {
    for (const slide of draft.slides) if (slideIds.includes(slide.id)) pasteSlideStyle(slide, style);
  });
  if (slideIds.length > 1) notify({ title: `Style applied to ${plural(slideIds.length)}`, tone: 'success', action: undoAction });
}

/* ───────────── menus ───────────── */

export function elementMenu(slideId: string, elementId: string, outputId: string | null): ContextMenuItem[] {
  const { slide, element } = find(slideId, elementId);
  if (!slide || !element) return [];
  const { selection } = store();
  const ids = selection.slideId === slideId && selection.elementIds.includes(elementId) ? selection.elementIds : [elementId];
  const label = kindLabel(element);
  const clipboard = useStyleClipboard.getState().element;
  const many = ids.length > 1;

  const items: ContextMenuItem[] = [
    { label: `Copy ${label} style`, icon: <Paintbrush size={14} />, shortcut: '⌥⇧C', onSelect: () => copyElementStyle(slideId, elementId, outputId) },
    {
      label: clipboard && canPaste(clipboard, element) ? `Paste ${clipboard.label} style` : 'Paste style',
      icon: <ClipboardPaste size={14} />, shortcut: '⌥⇧V', disabled: !canPaste(clipboard, element), onSelect: () => pasteElementStyle(slideId, ids),
    },
    { label: `Apply ${label} style to all screenshots`, icon: <Wand size={14} />, onSelect: () => applyStyleToAll(slideId, elementId, outputId) },
    { label: 'Same position on all screenshots', icon: <Move size={14} />, onSelect: () => samePositionOnAll(slideId, elementId, outputId) },
    { separator: true },
  ];

  if (element.type === 'device') {
    items.push({
      label: element.screen.assetId ? 'Replace screenshot…' : 'Add screenshot…', icon: <ImagePlus size={14} />,
      onSelect: async () => {
        const file = await pickImage();
        if (!file) return;
        const asset = await readImageFile(file);
        const assetId = store().addAsset({ name: file.name, ...asset });
        store().setDeviceScreenshot(slideId, elementId, assetId);
      },
    });
    if (element.screen.assetId) items.push({ label: 'Remove screenshot', icon: <ImageOff size={14} />, onSelect: () => store().setDeviceScreenshot(slideId, elementId, null) });
  }
  if (element.type === 'text' && !many) {
    items.push({ label: 'Edit text', icon: <Type size={14} />, shortcut: '↵', onSelect: () => { store().selectElement(slideId, elementId, outputId); store().setEditingText(elementId); } });
  }
  items.push(
    { label: 'Center on screenshot', icon: <Crosshair size={14} />, onSelect: () => store().updateElements(slideId, ids, { x: 0.5 }) },
    {
      label: 'Arrange', icon: <Layers size={14} />, submenu: [
        { label: 'Bring to front', icon: <ArrowUpToLine size={14} />, shortcut: '⌘]', onSelect: () => ids.forEach((id) => store().reorderElement(slideId, id, 'front')) },
        { label: 'Bring forward', icon: <ArrowUp size={14} />, shortcut: ']', onSelect: () => ids.forEach((id) => store().reorderElement(slideId, id, 'forward')) },
        { label: 'Send backward', icon: <ArrowDown size={14} />, shortcut: '[', onSelect: () => ids.forEach((id) => store().reorderElement(slideId, id, 'backward')) },
        { label: 'Send to back', icon: <ArrowDownToLine size={14} />, shortcut: '⌘[', onSelect: () => ids.forEach((id) => store().reorderElement(slideId, id, 'back')) },
      ],
    },
    { separator: true },
    { label: many ? `Duplicate ${ids.length} layers` : 'Duplicate', icon: <CopyPlus size={14} />, shortcut: '⌘D', onSelect: () => store().duplicateElements(slideId, ids) },
    { label: element.visible ? 'Hide' : 'Show', icon: element.visible ? <EyeOff size={14} /> : <Eye size={14} />, shortcut: '⇧⌘H', onSelect: () => store().updateElements(slideId, ids, { visible: !element.visible }) },
    { label: element.locked ? 'Unlock' : 'Lock', icon: element.locked ? <LockOpen size={14} /> : <Lock size={14} />, shortcut: '⇧⌘L', onSelect: () => store().updateElements(slideId, ids, { locked: !element.locked }) },
    { separator: true },
    { label: many ? `Delete ${ids.length} layers` : 'Delete', icon: <Trash2 size={14} />, shortcut: '⌫', danger: true, onSelect: () => store().removeElements(slideId, ids) },
  );
  return items;
}

/** `at` is where the menu was opened, as fractions of the screenshot, so "Add here" lands under the cursor. */
export function slideMenu(slideId: string, outputId: string | null, at?: { x: number; y: number }): ContextMenuItem[] {
  const { slide } = find(slideId);
  if (!slide) return [];
  const { project } = store();
  const index = project.slides.findIndex((item) => item.id === slideId);
  const { slide: copiedSlide, background: copiedBackground } = useStyleClipboard.getState();
  const others = project.slides.filter((item) => item.id !== slideId).map((item) => item.id);
  const add = (element: StudioElement) => {
    store().addElement(slideId, element);
    store().selectElement(slideId, element.id, outputId);
    if (element.type === 'text') store().setEditingText(element.id);
  };

  return [
    { label: 'Copy as image', icon: <ClipboardCopy size={14} />, shortcut: '⇧⌘C', onSelect: () => void copySlideImage(slideId, outputId ?? undefined) },
    { separator: true },
    { label: 'Copy screenshot style', icon: <Paintbrush size={14} />, shortcut: '⌥⇧C', onSelect: () => copySlideStyle(slideId, outputId) },
    { label: 'Paste screenshot style', icon: <ClipboardPaste size={14} />, shortcut: '⌥⇧V', disabled: !copiedSlide, onSelect: () => pasteSlideStyleTo([slideId]) },
    {
      label: 'Apply this style to all screenshots', icon: <Wand size={14} />, disabled: others.length === 0,
      onSelect: () => {
        useStyleClipboard.setState({ slide: slideStyleOf(slide, (element) => resolveElement(slide, element, outputId)) });
        pasteSlideStyleTo(others);
      },
    },
    {
      label: 'Background', icon: <PaintBucket size={14} />, submenu: [
        { label: 'Copy background', onSelect: () => { useStyleClipboard.setState({ background: structuredClone(slide.background) }); notify({ title: 'Background copied', tone: 'info' }); } },
        { label: 'Paste background', disabled: !copiedBackground, onSelect: () => copiedBackground && store().setBackground(slideId, structuredClone(copiedBackground)) },
        {
          label: 'Use on all screenshots', disabled: others.length === 0,
          onSelect: () => {
            store().setBackground(slideId, structuredClone(slide.background), { allSlides: true });
            notify({ title: `Background used on all ${project.slides.length} screenshots`, tone: 'success', action: undoAction });
          },
        },
      ],
    },
    { separator: true },
    {
      label: at ? 'Add here' : 'Add', icon: <Plus size={14} />, submenu: [
        { label: 'Text', icon: <Type size={14} />, onSelect: () => add(createText('caption', { text: 'New text', x: at?.x ?? 0.5, y: at?.y ?? 0.45 })) },
        { label: 'Phone', icon: <Smartphone size={14} />, onSelect: () => add(createDevice({ x: at?.x ?? 0.5, y: at?.y ?? 0.6, h: 0.6 })) },
      ],
    },
    { separator: true },
    { label: 'Duplicate screenshot', icon: <CopyPlus size={14} />, shortcut: '⌘D', onSelect: () => store().duplicateSlide(slideId) },
    { label: 'Move left', icon: <ArrowLeft size={14} />, disabled: index <= 0, onSelect: () => store().moveSlide(slideId, index - 1) },
    { label: 'Move right', icon: <ArrowRight size={14} />, disabled: index >= project.slides.length - 1, onSelect: () => store().moveSlide(slideId, index + 1) },
    { separator: true },
    { label: 'Delete screenshot', icon: <Trash2 size={14} />, danger: true, disabled: project.slides.length <= 1, onSelect: () => store().removeSlide(slideId) },
  ];
}
