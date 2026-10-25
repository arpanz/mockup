import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Draft } from 'immer';
import type { StudioElement } from '../model/types';
import { resolveElement } from '../model/units';
import { selectActiveOutput, selectActiveSlide, useEditor } from '../store/editorStore';

interface UiPrefs {
  /** Style edits (fonts, colors, frame…) apply to the same element on every screenshot. */
  syncStyles: boolean;
  setSyncStyles: (value: boolean) => void;
}

export const useUiPrefs = create<UiPrefs>()(
  persist(
    (set) => ({
      syncStyles: true,
      setSyncStyles: (syncStyles) => set({ syncStyles }),
    }),
    { name: 'frameflow-ui-prefs' },
  ),
);

/** The active slide/output and the resolved selected elements, plus an edit helper. */
export function useSelected() {
  const slide = useEditor(selectActiveSlide);
  const output = useEditor(selectActiveOutput);
  const elementIds = useEditor((state) => state.selection.elementIds);
  const overrideOutputId = useEditor((state) => state.overrideOutputId);
  const syncStyles = useUiPrefs((state) => state.syncStyles);

  const elements = slide
    ? slide.elements.filter((element) => elementIds.includes(element.id)).map((element) => resolveElement(slide, element, output?.id ?? null))
    : [];

  /**
   * Patch the selected elements. `style` edits follow the sync preference; content/position edits never sync.
   * `key` groups rapid changes (slider drags, typing) into one undo step.
   */
  const update = (
    patch: Partial<StudioElement> | ((element: Draft<StudioElement>) => void),
    key: string,
    kind: 'style' | 'content' = 'style',
  ) => {
    if (!slide) return;
    useEditor.getState().updateElements(slide.id, elementIds, patch, {
      coalesce: `${key}-${elementIds.join(',')}`,
      syncAllSlides: kind === 'style' && syncStyles && !overrideOutputId,
    });
  };

  return { slide, output, elements, update, overrideOutputId };
}
