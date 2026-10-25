import { produce, type Draft } from 'immer';
import { create } from 'zustand';
import { createDevice, createProject, createSlide, makeId } from '../model/defaults';
import { OUTPUT_CATALOG } from '../model/outputs';
import type {
  Asset,
  Background,
  EditorMode,
  Id,
  Project,
  Selection,
  Slide,
  StudioElement,
} from '../model/types';

/** Keys that describe content or placement, never synced across slides by "apply to all". */
const UNSYNCED_KEYS = new Set(['id', 'name', 'text', 'x', 'y', 'screen', 'assetId', 'visible', 'locked']);

const HISTORY_LIMIT = 120;
const COALESCE_MS = 800;

export interface ViewState {
  zoom: number;
  x: number;
  y: number;
}

export interface UpdateOptions {
  /** Merge rapid edits (slider drags, typing) into one undo step. */
  coalesce?: string;
  /** Also apply style keys to the same kind of element on every slide. */
  syncAllSlides?: boolean;
}

interface EditorState {
  project: Project;
  hydrated: boolean;
  selection: Selection;
  hoverElementId: Id | null;
  editingTextId: Id | null;
  mode: EditorMode;
  view: ViewState;
  /** When set, element edits are written as overrides for this output only. */
  overrideOutputId: Id | null;
  past: Project[];
  future: Project[];
  lastCoalesce: { key: string; at: number } | null;

  // document
  loadProject: (project: Project) => void;
  newProject: () => void;
  renameProject: (name: string) => void;
  commit: (recipe: (draft: Draft<Project>) => void, options?: { coalesce?: string }) => void;
  undo: () => void;
  redo: () => void;

  // slides
  addSlide: (afterSlideId?: Id, slide?: Slide) => Id;
  duplicateSlide: (slideId: Id) => Id | null;
  removeSlide: (slideId: Id) => void;
  moveSlide: (slideId: Id, toIndex: number) => void;
  renameSlide: (slideId: Id, name: string) => void;
  setBackground: (slideId: Id, background: Background, options?: UpdateOptions & { allSlides?: boolean }) => void;
  setSpan: (patch: Partial<Project['span']>, options?: UpdateOptions) => void;

  // elements
  addElement: (slideId: Id, element: StudioElement) => void;
  updateElements: (slideId: Id, ids: Id[], patch: Partial<StudioElement> | ((element: Draft<StudioElement>) => void), options?: UpdateOptions) => void;
  removeElements: (slideId: Id, ids: Id[]) => void;
  duplicateElements: (slideId: Id, ids: Id[]) => Id[];
  reorderElement: (slideId: Id, id: Id, direction: 'forward' | 'backward' | 'front' | 'back') => void;
  moveElementToIndex: (slideId: Id, id: Id, toIndex: number) => void;
  clearOverrides: (slideId: Id, outputId: Id, elementId?: Id) => void;

  // assets
  addAsset: (asset: Omit<Asset, 'id'>) => Id;
  setDeviceScreenshot: (slideId: Id, elementId: Id, assetId: Id | null) => void;
  /** Fill empty device screens in slide order, then append new slides for the remaining images. */
  placeScreenshots: (assets: Array<Omit<Asset, 'id'>>, startSlideId?: Id) => void;

  // outputs
  toggleOutput: (outputId: Id) => void;
  setPrimaryOutput: (outputId: Id) => void;

  // editor ui
  select: (selection: Partial<Selection>) => void;
  selectElement: (slideId: Id, elementId: Id, outputId: Id | null, additive?: boolean) => void;
  selectSlide: (slideId: Id, outputId?: Id | null) => void;
  clearSelection: () => void;
  setHover: (id: Id | null) => void;
  setEditingText: (id: Id | null) => void;
  setMode: (mode: EditorMode) => void;
  setView: (view: Partial<ViewState>) => void;
  setOverrideOutput: (outputId: Id | null) => void;
}

const findSlide = (project: Draft<Project>, slideId: Id) => project.slides.find((slide) => slide.id === slideId);

function freshIds<T extends StudioElement>(element: T): T {
  return { ...structuredClone(element), id: makeId() };
}

export const useEditor = create<EditorState>()((set, get) => {
  const commit: EditorState['commit'] = (recipe, options) => {
    const { project, past, lastCoalesce } = get();
    const next = produce(project, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
    if (next === project) return;
    const now = Date.now();
    const merge = options?.coalesce && lastCoalesce?.key === options.coalesce && now - lastCoalesce.at < COALESCE_MS;
    set({
      project: next,
      past: merge ? past : [...past, project].slice(-HISTORY_LIMIT),
      future: [],
      lastCoalesce: options?.coalesce ? { key: options.coalesce, at: now } : null,
    });
  };

  return {
    project: createProject(),
    hydrated: false,
    selection: { slideId: null, elementIds: [], outputId: null },
    hoverElementId: null,
    editingTextId: null,
    mode: 'editor',
    view: { zoom: 0.2, x: 0, y: 0 },
    overrideOutputId: null,
    past: [],
    future: [],
    lastCoalesce: null,

    loadProject: (project) => set({
      project,
      hydrated: true,
      past: [],
      future: [],
      selection: { slideId: project.slides[0]?.id ?? null, elementIds: [], outputId: project.outputs[0]?.id ?? null },
      overrideOutputId: null,
      editingTextId: null,
    }),
    newProject: () => get().loadProject(createProject()),
    renameProject: (name) => commit((draft) => { draft.name = name; }, { coalesce: 'project-name' }),
    commit,

    undo: () => {
      const { past, project, future } = get();
      const previous = past[past.length - 1];
      if (!previous) return;
      set({ project: previous, past: past.slice(0, -1), future: [project, ...future], lastCoalesce: null, editingTextId: null });
    },
    redo: () => {
      const { past, project, future } = get();
      const next = future[0];
      if (!next) return;
      set({ project: next, past: [...past, project], future: future.slice(1), lastCoalesce: null, editingTextId: null });
    },

    addSlide: (afterSlideId, slide) => {
      const created = slide ?? (() => {
        // New slides inherit the look of the slide they follow: same background and element styles, empty screen.
        const source = get().project.slides.find((s) => s.id === afterSlideId) ?? get().project.slides.at(-1);
        if (!source) return createSlide();
        const copy = structuredClone(source);
        return {
          ...copy,
          id: makeId(),
          overrides: {},
          elements: copy.elements.map((element) => {
            const fresh = freshIds(element);
            if (fresh.type === 'device') fresh.screen = { ...fresh.screen, assetId: null };
            return fresh;
          }),
        };
      })();
      commit((draft) => {
        const index = afterSlideId ? draft.slides.findIndex((s) => s.id === afterSlideId) + 1 : draft.slides.length;
        created.name = `Screenshot ${draft.slides.length + 1}`;
        draft.slides.splice(index || draft.slides.length, 0, created);
      });
      set((state) => ({ selection: { ...state.selection, slideId: created.id, elementIds: [] } }));
      return created.id;
    },
    duplicateSlide: (slideId) => {
      const source = get().project.slides.find((s) => s.id === slideId);
      if (!source) return null;
      const idMap = new Map<string, string>();
      const copy: Slide = {
        ...structuredClone(source),
        id: makeId(),
        name: `${source.name} copy`,
        elements: source.elements.map((element) => {
          const fresh = freshIds(element);
          idMap.set(element.id, fresh.id);
          return fresh;
        }),
      };
      copy.overrides = Object.fromEntries(
        Object.entries(copy.overrides).map(([outputId, byElement]) => [
          outputId,
          Object.fromEntries(Object.entries(byElement).map(([elementId, patch]) => [idMap.get(elementId) ?? elementId, patch])),
        ]),
      );
      commit((draft) => {
        const index = draft.slides.findIndex((s) => s.id === slideId);
        draft.slides.splice(index + 1, 0, copy);
      });
      set((state) => ({ selection: { ...state.selection, slideId: copy.id, elementIds: [] } }));
      return copy.id;
    },
    removeSlide: (slideId) => {
      const { project, selection } = get();
      if (project.slides.length <= 1) return;
      const index = project.slides.findIndex((s) => s.id === slideId);
      commit((draft) => { draft.slides = draft.slides.filter((s) => s.id !== slideId); });
      if (selection.slideId === slideId) {
        const neighbour = get().project.slides[Math.max(0, index - 1)];
        set({ selection: { ...selection, slideId: neighbour?.id ?? null, elementIds: [] } });
      }
    },
    moveSlide: (slideId, toIndex) => commit((draft) => {
      const from = draft.slides.findIndex((s) => s.id === slideId);
      if (from < 0) return;
      const [slide] = draft.slides.splice(from, 1);
      draft.slides.splice(Math.max(0, Math.min(toIndex, draft.slides.length)), 0, slide);
    }),
    renameSlide: (slideId, name) => commit((draft) => {
      const slide = findSlide(draft, slideId);
      if (slide) slide.name = name;
    }, { coalesce: `slide-name-${slideId}` }),
    setBackground: (slideId, background, options) => commit((draft) => {
      for (const slide of draft.slides) {
        if (options?.allSlides || slide.id === slideId) slide.background = structuredClone(background);
      }
    }, { coalesce: options?.coalesce }),
    setSpan: (patch, options) => commit((draft) => {
      Object.assign(draft.span, structuredClone(patch));
    }, { coalesce: options?.coalesce }),

    addElement: (slideId, element) => {
      commit((draft) => { findSlide(draft, slideId)?.elements.push(element); });
      set((state) => ({ selection: { ...state.selection, slideId, elementIds: [element.id] } }));
    },
    updateElements: (slideId, ids, patch, options) => {
      const overrideOutputId = get().overrideOutputId;
      commit((draft) => {
        const slide = findSlide(draft, slideId);
        if (!slide) return;
        const targets = slide.elements.filter((element) => ids.includes(element.id));

        if (overrideOutputId) {
          // Overrides: compute the patched element against the resolved one and store only changed keys.
          slide.overrides[overrideOutputId] ??= {};
          const bucket = slide.overrides[overrideOutputId];
          for (const element of targets) {
            const resolved = { ...structuredClone(element), ...(bucket[element.id] ?? {}) } as StudioElement;
            const next = typeof patch === 'function'
              ? produce(resolved, (d) => { patch(d as Draft<StudioElement>); })
              : { ...resolved, ...patch } as StudioElement;
            const changed: Record<string, unknown> = { ...(bucket[element.id] ?? {}) };
            for (const key of Object.keys(next) as Array<keyof StudioElement>) {
              if (JSON.stringify(next[key]) !== JSON.stringify(element[key])) changed[key] = structuredClone(next[key]);
              else delete changed[key];
            }
            bucket[element.id] = changed as Partial<StudioElement>;
          }
          return;
        }

        const apply = (element: Draft<StudioElement>) => {
          if (typeof patch === 'function') patch(element);
          else Object.assign(element, structuredClone(patch));
        };
        targets.forEach(apply);

        if (options?.syncAllSlides) {
          for (const source of targets) {
            const styleOnly = (element: Draft<StudioElement>) => {
              const updated = typeof patch === 'function'
                ? produce(structuredClone(element) as StudioElement, (d) => { patch(d as Draft<StudioElement>); })
                : ({ ...structuredClone(element), ...patch } as StudioElement);
              for (const key of Object.keys(updated)) {
                if (UNSYNCED_KEYS.has(key)) continue;
                (element as unknown as Record<string, unknown>)[key] = structuredClone((updated as unknown as Record<string, unknown>)[key]);
              }
            };
            for (const other of draft.slides) {
              if (other.id === slideId) continue;
              for (const element of other.elements) {
                const sameKind = element.type === source.type && (element.type !== 'text' || source.type !== 'text' || element.role === source.role);
                if (sameKind) styleOnly(element);
              }
            }
          }
        }
      }, { coalesce: options?.coalesce });
    },
    removeElements: (slideId, ids) => {
      commit((draft) => {
        const slide = findSlide(draft, slideId);
        if (!slide) return;
        slide.elements = slide.elements.filter((element) => !ids.includes(element.id));
        for (const bucket of Object.values(slide.overrides)) for (const id of ids) delete bucket[id];
      });
      set((state) => ({ selection: { ...state.selection, elementIds: state.selection.elementIds.filter((id) => !ids.includes(id)) } }));
    },
    duplicateElements: (slideId, ids) => {
      const created: StudioElement[] = [];
      commit((draft) => {
        const slide = findSlide(draft, slideId);
        if (!slide) return;
        for (const id of ids) {
          const index = slide.elements.findIndex((element) => element.id === id);
          if (index < 0) continue;
          const copy = freshIds(slide.elements[index] as StudioElement);
          copy.x += 0.03;
          copy.y += 0.015;
          copy.name = `${copy.name} copy`;
          slide.elements.splice(index + 1 + created.length, 0, copy);
          created.push(copy);
        }
      });
      const createdIds = created.map((element) => element.id);
      set((state) => ({ selection: { ...state.selection, slideId, elementIds: createdIds } }));
      return createdIds;
    },
    reorderElement: (slideId, id, direction) => commit((draft) => {
      const slide = findSlide(draft, slideId);
      if (!slide) return;
      const index = slide.elements.findIndex((element) => element.id === id);
      if (index < 0) return;
      const [element] = slide.elements.splice(index, 1);
      const target = direction === 'front' ? slide.elements.length
        : direction === 'back' ? 0
          : direction === 'forward' ? Math.min(slide.elements.length, index + 1)
            : Math.max(0, index - 1);
      slide.elements.splice(target, 0, element);
    }),
    moveElementToIndex: (slideId, id, toIndex) => commit((draft) => {
      const slide = findSlide(draft, slideId);
      if (!slide) return;
      const index = slide.elements.findIndex((element) => element.id === id);
      if (index < 0) return;
      const [element] = slide.elements.splice(index, 1);
      slide.elements.splice(Math.max(0, Math.min(toIndex, slide.elements.length)), 0, element);
    }),
    clearOverrides: (slideId, outputId, elementId) => commit((draft) => {
      const slide = findSlide(draft, slideId);
      if (!slide?.overrides[outputId]) return;
      if (elementId) delete slide.overrides[outputId][elementId];
      else delete slide.overrides[outputId];
    }),

    addAsset: (asset) => {
      const id = makeId();
      commit((draft) => { draft.assets[id] = { ...asset, id }; });
      return id;
    },
    setDeviceScreenshot: (slideId, elementId, assetId) => {
      get().updateElements(slideId, [elementId], (element) => {
        if (element.type === 'device') element.screen.assetId = assetId;
      });
    },
    placeScreenshots: (assets, startSlideId) => {
      if (assets.length === 0) return;
      const ids = assets.map(() => makeId());
      let lastSlideId: Id | null = null;
      commit((draft) => {
        assets.forEach((asset, index) => { draft.assets[ids[index]] = { ...asset, id: ids[index] }; });
        let queue = [...ids];
        const startIndex = Math.max(0, draft.slides.findIndex((slide) => slide.id === startSlideId));
        for (const slide of draft.slides.slice(startIndex)) {
          if (queue.length === 0) break;
          for (const element of slide.elements) {
            if (queue.length === 0) break;
            if (element.type === 'device' && !element.screen.assetId) {
              element.screen.assetId = queue.shift() ?? null;
              lastSlideId = slide.id;
            }
          }
        }
        const template = draft.slides.at(-1);
        while (queue.length > 0) {
          const base = template ? structuredClone(template) as Slide : createSlide();
          const slide: Slide = {
            ...base,
            id: makeId(),
            name: `Screenshot ${draft.slides.length + 1}`,
            overrides: {},
            elements: base.elements.map((element) => freshIds(element as StudioElement)),
          };
          let device = slide.elements.find((element) => element.type === 'device');
          if (!device) {
            device = createDevice();
            slide.elements.push(device);
          }
          if (device.type === 'device') device.screen = { ...device.screen, assetId: queue.shift() ?? null };
          draft.slides.push(slide);
          lastSlideId = slide.id;
          queue = queue.filter(Boolean);
        }
      });
      if (lastSlideId) set((state) => ({ selection: { ...state.selection, slideId: lastSlideId, elementIds: [] } }));
    },

    toggleOutput: (outputId) => commit((draft) => {
      const exists = draft.outputs.some((output) => output.id === outputId);
      if (exists) {
        if (draft.outputs.length > 1) draft.outputs = draft.outputs.filter((output) => output.id !== outputId);
      } else {
        const spec = OUTPUT_CATALOG.find((output) => output.id === outputId);
        if (spec) draft.outputs.push(structuredClone(spec));
      }
    }),
    setPrimaryOutput: (outputId) => commit((draft) => {
      const index = draft.outputs.findIndex((output) => output.id === outputId);
      if (index <= 0) return;
      const [output] = draft.outputs.splice(index, 1);
      draft.outputs.unshift(output);
    }),

    select: (selection) => set((state) => ({ selection: { ...state.selection, ...selection } })),
    selectElement: (slideId, elementId, outputId, additive) => set((state) => {
      const sameSlide = state.selection.slideId === slideId;
      const current = sameSlide ? state.selection.elementIds : [];
      const elementIds = additive
        ? current.includes(elementId) ? current.filter((id) => id !== elementId) : [...current, elementId]
        : [elementId];
      return { selection: { slideId, elementIds, outputId: outputId ?? state.selection.outputId }, editingTextId: null };
    }),
    selectSlide: (slideId, outputId) => set((state) => ({
      selection: { slideId, elementIds: [], outputId: outputId === undefined ? state.selection.outputId : outputId },
      editingTextId: null,
    })),
    clearSelection: () => set((state) => ({ selection: { ...state.selection, elementIds: [] }, editingTextId: null })),
    setHover: (hoverElementId) => set({ hoverElementId }),
    setEditingText: (editingTextId) => set({ editingTextId }),
    setMode: (mode) => set({ mode, editingTextId: null }),
    setView: (view) => set((state) => ({ view: { ...state.view, ...view } })),
    setOverrideOutput: (overrideOutputId) => set({ overrideOutputId }),
  };
});

/* ───────── selectors ───────── */

export const selectActiveSlide = (state: EditorState) =>
  state.project.slides.find((slide) => slide.id === state.selection.slideId) ?? state.project.slides[0];

export const selectActiveOutput = (state: EditorState) =>
  state.project.outputs.find((output) => output.id === state.selection.outputId) ?? state.project.outputs[0];

export type { EditorState };
