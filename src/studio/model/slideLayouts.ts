import { current, type Draft } from 'immer';
import { makeId } from './defaults';
import { DEFAULT_SET_LAYOUT } from './setLayout';
import type { DeviceElement, Project, Slide, TextAlign, TextElement } from './types';

type TextPlacement = { x: number; y: number; w: number; align: TextAlign };
type DevicePlacement = { x: number; y: number; h: number; rotation: number };
export interface SlideLayout {
  id: string;
  name: string;
  title?: TextPlacement;
  subtitle?: TextPlacement;
  devices: DevicePlacement[];
  hideText?: boolean;
}

const centeredTitle: TextPlacement = { x: 0.5, y: 0.1, w: 0.86, align: 'center' };
const centeredSubtitle: TextPlacement = { x: 0.5, y: 0.192, w: 0.8, align: 'center' };

export const SLIDE_LAYOUTS: Array<SlideLayout> = [
  { id: 'text-top', name: 'Text on top', title: centeredTitle, subtitle: centeredSubtitle, devices: [{ x: 0.5, y: 0.645, h: 0.79, rotation: 0 }] },
  { id: 'bleed', name: 'Phone bleeds', title: { ...centeredTitle, y: 0.095 }, subtitle: { ...centeredSubtitle, y: 0.187 }, devices: [{ x: 0.5, y: 0.68, h: 0.86, rotation: 0 }] },
  { id: 'text-bottom', name: 'Text below', title: { ...centeredTitle, y: 0.8 }, subtitle: { ...centeredSubtitle, y: 0.895 }, devices: [{ x: 0.5, y: 0.3, h: 0.82, rotation: 0 }] },
  { id: 'left', name: 'Left aligned', title: { x: 0.5, y: 0.1, w: 0.84, align: 'left' }, subtitle: { x: 0.48, y: 0.192, w: 0.8, align: 'left' }, devices: [{ x: 0.6, y: 0.69, h: 0.78, rotation: 4 }] },
  { id: 'duo', name: 'Two phones', title: centeredTitle, subtitle: centeredSubtitle, devices: [{ x: 0.36, y: 0.7, h: 0.72, rotation: -7 }, { x: 0.7, y: 0.73, h: 0.68, rotation: 7 }] },
  { id: 'phone-only', name: 'Just the phone', devices: [{ x: 0.5, y: 0.53, h: 0.9, rotation: 0 }], hideText: true },
];

const clearPlacementOverrides = (slide: Draft<Slide>, elementId: string) => {
  for (const [outputId, elements] of Object.entries(slide.overrides)) {
    const patch = elements[elementId] as Record<string, unknown> | undefined;
    if (!patch) continue;
    for (const key of ['x', 'y', 'h', 'w', 'rotation', 'align']) delete patch[key];
    if (Object.keys(patch).length === 0) delete elements[elementId];
    if (Object.keys(elements).length === 0) delete slide.overrides[outputId];
  }
};

export function applySlideLayout(draft: Draft<Project>, slideId: string, layoutId: string) {
  const slideIndex = draft.slides.findIndex((slide) => slide.id === slideId);
  const slide = draft.slides[slideIndex];
  const layout = SLIDE_LAYOUTS.find((item) => item.id === layoutId);
  if (!slide || !layout) return;

  const title = slide.elements.find((element) => element.type === 'text' && element.role === 'title');
  const subtitle = slide.elements.find((element) => element.type === 'text' && element.role === 'subtitle');
  const devices = slide.elements.filter((element) => element.type === 'device');
  const movedTexts: Array<Draft<TextElement>> = [];
  const movedDevices: Array<Draft<DeviceElement>> = [];
  if (title?.type === 'text') {
    if (layout.hideText) title.visible = false;
    else {
      title.visible = true;
      if (layout.title) Object.assign(title, layout.title);
      movedTexts.push(title);
    }
  }
  if (subtitle?.type === 'text') {
    if (layout.hideText) subtitle.visible = false;
    else if (layout.subtitle) {
      Object.assign(subtitle, layout.subtitle);
      movedTexts.push(subtitle);
    }
  }

  if (layout.id === 'duo' && devices.length === 1) {
    // Immer drafts are proxies, which structuredClone refuses; clone the plain current value instead.
    const copy = structuredClone(current(devices[0]));
    copy.id = makeId();
    copy.name = 'Second device';
    const nextSlide = draft.slides[(slideIndex + 1) % draft.slides.length];
    const nextDevice = nextSlide?.elements.find((element) => element.type === 'device');
    if (nextDevice?.type === 'device') copy.screen = structuredClone(current(nextDevice.screen));
    const firstIndex = slide.elements.findIndex((element) => element.id === devices[0].id);
    // Behind the first phone, like the Duo template, so the main screen stays on top.
    slide.elements.splice(firstIndex, 0, copy);
    devices.push(copy);
  }

  devices.forEach((device, index) => {
    const placement = layout.devices[index] ?? (index === 1 ? SLIDE_LAYOUTS[4].devices[1] : undefined);
    if (!placement || device.type !== 'device') return;
    Object.assign(device, placement);
    movedDevices.push(device);
  });
  for (const element of [...movedTexts, ...movedDevices]) clearPlacementOverrides(slide, element.id);

  // The layout's numbers are the template baseline. Re-apply the set's Whole-set tuning to just what was placed
  // (font sizes were kept, so they already carry it), the same way applySetLayout moves things.
  const set = { ...DEFAULT_SET_LAYOUT, ...draft.layout };
  const top = Math.min(...movedDevices.map((device) => device.y - device.h / 2));
  const centerX = movedDevices.reduce((sum, device) => sum + device.x, 0) / Math.max(1, movedDevices.length);
  for (const device of movedDevices) {
    device.h *= set.deviceScale;
    device.y = top + (device.y - top) * set.deviceScale + set.deviceShift;
    if (movedDevices.length > 1) device.x = centerX + (device.x - centerX) * set.deviceScale;
  }
  for (const text of movedTexts) text.y += set.textShift;
}
