import type { Draft } from 'immer';
import type { Project, SetLayout, StudioElement } from './types';

/**
 * Whole-set adjustments: resize or move every phone, headline and subtitle at once. Values are stored on the project
 * and every change is applied as the difference from the previous value, so dragging a slider back to 100% returns
 * the template's layout exactly instead of drifting.
 */
export const DEFAULT_SET_LAYOUT: SetLayout = { deviceScale: 1, deviceShift: 0, titleScale: 1, subtitleScale: 1, textShift: 0 };

/** Ranges are deliberately narrow: enough to tune a template, not enough to push phones into the headline. */
export const SET_LAYOUT_RANGES: Record<keyof SetLayout, [number, number]> = {
  deviceScale: [0.85, 1.15],
  deviceShift: [-0.08, 0.08],
  titleScale: [0.8, 1.2],
  subtitleScale: [0.8, 1.25],
  textShift: [-0.04, 0.08],
};

const clamp = (value: number, [min, max]: [number, number]) => Math.min(max, Math.max(min, value));

type Patch = Partial<StudioElement> & { h?: number; fontSize?: number; x?: number; y?: number };

export function applySetLayout(draft: Draft<Project>, patch: Partial<SetLayout>) {
  const from = { ...DEFAULT_SET_LAYOUT, ...draft.layout };
  const to = { ...from };
  for (const key of Object.keys(patch) as Array<keyof SetLayout>) to[key] = clamp(patch[key]!, SET_LAYOUT_RANGES[key]);
  const scale = to.deviceScale / from.deviceScale;
  const shift = to.deviceShift - from.deviceShift;
  const titleScale = to.titleScale / from.titleScale;
  const subtitleScale = to.subtitleScale / from.subtitleScale;
  const textShift = to.textShift - from.textShift;

  for (const slide of draft.slides) {
    const devices = slide.elements.filter((element) => element.type === 'device');
    // Phones grow from their top edge (so they never climb into the headline), and when a slide has several, their
    // spacing scales with them so neighbours can't start to overlap.
    const centerX = devices.reduce((sum, device) => sum + device.x, 0) / Math.max(1, devices.length);
    const top = Math.min(...devices.map((device) => device.type === 'device' ? device.y - device.h / 2 : Infinity));
    const adjust = (element: StudioElement, target: Patch) => {
      if (element.type === 'device') {
        if (target.h !== undefined) target.h *= scale;
        if (target.y !== undefined) target.y = top + (target.y - top) * scale + shift;
        if (devices.length > 1 && target.x !== undefined) target.x = centerX + (target.x - centerX) * scale;
      } else if (element.type === 'text') {
        if (target.fontSize !== undefined) target.fontSize *= element.role === 'subtitle' ? subtitleScale : element.role === 'title' ? titleScale : 1;
        if (target.y !== undefined) target.y += textShift;
      }
    };
    for (const element of slide.elements) {
      adjust(element, element as Patch);
      // Per-size tweaks that set the same properties follow along, so every store size keeps its proportions.
      for (const overrides of Object.values(slide.overrides)) {
        const override = overrides[element.id] as Patch | undefined;
        if (override) adjust(element, override);
      }
    }
  }
  draft.layout = to;
}

/** Show or hide every subtitle in the set. */
export function setSubtitlesVisible(draft: Draft<Project>, visible: boolean) {
  for (const slide of draft.slides) {
    for (const element of slide.elements) if (element.type === 'text' && element.role === 'subtitle') element.visible = visible;
  }
}
