import { useEffect } from 'react';
import type { StudioElement } from '../model/types';
import { makeId } from '../model/defaults';
import { resolveElement } from '../model/units';
import { useEditor } from '../store/editorStore';
import { canvasCommands } from './Canvas';

/** In-memory clipboard for elements (survives slide changes, not reloads). */
let clipboard: StudioElement[] = [];

const isTyping = (target: EventTarget | null) =>
  Boolean((target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]'));

export function useShortcuts(handlers: { openFilePicker: () => void; openExport: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      const store = useEditor.getState();
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      const { selection, project } = store;
      const slide = project.slides.find((item) => item.id === selection.slideId);
      const ids = selection.elementIds;

      // History
      if (mod && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (mod && key === 'y') {
        event.preventDefault();
        store.redo();
        return;
      }

      // View
      if ((event.shiftKey && event.code === 'Digit1') || (mod && key === '0')) {
        event.preventDefault();
        canvasCommands.fit();
        return;
      }
      if (mod && (key === '=' || key === '+')) {
        event.preventDefault();
        canvasCommands.zoomBy(1.25);
        return;
      }
      if (mod && key === '-') {
        event.preventDefault();
        canvasCommands.zoomBy(0.8);
        return;
      }
      if (event.shiftKey && event.code === 'Digit0') {
        event.preventDefault();
        canvasCommands.zoomTo(0.5);
        return;
      }

      // Creation & modes
      if (event.altKey && event.code === 'KeyS') {
        event.preventDefault();
        handlers.openFilePicker();
        return;
      }
      if (mod && event.shiftKey && key === 'e') {
        event.preventDefault();
        handlers.openExport();
        return;
      }
      if (!mod && !event.altKey && key === 'p' && !event.shiftKey) {
        store.setMode(store.mode === 'preview' ? 'editor' : 'preview');
        return;
      }

      if (key === 'escape') {
        // Let an open popover/dialog consume Escape first.
        if (document.querySelector('[role="dialog"]')) return;
        if (store.mode !== 'editor') store.setMode('editor');
        else store.clearSelection();
        return;
      }

      if (!slide) return;

      if (mod && key === 'a') {
        event.preventDefault();
        store.select({ elementIds: slide.elements.filter((element) => element.visible && !element.locked).map((element) => element.id) });
        return;
      }

      if (ids.length === 0) {
        // Slide-level navigation when nothing is selected.
        const index = project.slides.findIndex((item) => item.id === slide.id);
        if (key === 'arrowleft' || key === 'arrowright') {
          event.preventDefault();
          const next = project.slides[index + (key === 'arrowleft' ? -1 : 1)];
          if (next) store.selectSlide(next.id);
        }
        if (mod && key === 'd') {
          event.preventDefault();
          store.duplicateSlide(slide.id);
        }
        if (mod && key === 'v' && clipboard.length) {
          event.preventDefault();
          for (const element of clipboard) store.addElement(slide.id, { ...structuredClone(element), id: makeId() });
        }
        return;
      }

      if (key === 'delete' || key === 'backspace') {
        event.preventDefault();
        store.removeElements(slide.id, ids);
        return;
      }
      if (mod && key === 'd') {
        event.preventDefault();
        store.duplicateElements(slide.id, ids);
        return;
      }
      if (mod && (key === 'c' || key === 'x')) {
        event.preventDefault();
        clipboard = slide.elements.filter((element) => ids.includes(element.id)).map((element) => structuredClone(resolveElement(slide, element, selection.outputId)));
        if (key === 'x') store.removeElements(slide.id, ids);
        return;
      }
      if (mod && key === 'v' && clipboard.length) {
        event.preventDefault();
        const pasted: string[] = [];
        for (const element of clipboard) {
          const id = makeId();
          store.addElement(slide.id, { ...structuredClone(element), id, x: element.x + 0.02, y: element.y + 0.01 });
          pasted.push(id);
        }
        store.select({ elementIds: pasted });
        return;
      }
      if (key === ']' || key === '[') {
        event.preventDefault();
        const direction = key === ']' ? (mod ? 'front' : 'forward') : (mod ? 'back' : 'backward');
        for (const id of ids) store.reorderElement(slide.id, id, direction);
        return;
      }
      if (mod && event.shiftKey && key === 'h') {
        event.preventDefault();
        store.updateElements(slide.id, ids, (element) => { element.visible = !element.visible; });
        return;
      }
      if (mod && event.shiftKey && key === 'l') {
        event.preventDefault();
        store.updateElements(slide.id, ids, (element) => { element.locked = !element.locked; });
        return;
      }
      if (key === 'enter') {
        const first = slide.elements.find((element) => element.id === ids[0]);
        if (first?.type === 'text') {
          event.preventDefault();
          store.setEditingText(first.id);
        }
        return;
      }
      if (key.startsWith('arrow')) {
        event.preventDefault();
        const output = project.outputs.find((item) => item.id === selection.outputId) ?? project.outputs[0];
        const stepPx = event.shiftKey ? 10 : 1;
        const dx = key === 'arrowleft' ? -stepPx : key === 'arrowright' ? stepPx : 0;
        const dy = key === 'arrowup' ? -stepPx : key === 'arrowdown' ? stepPx : 0;
        store.updateElements(slide.id, ids, (element) => {
          element.x += dx / output.width;
          element.y += dy / output.height;
        }, { coalesce: 'nudge' });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers]);
}
