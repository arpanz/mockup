import type { OutputSpec, Slide, StudioElement } from './types';

/** Phone-portrait aspect used to normalise units across canvases (9 : 19.5). */
const REFERENCE_ASPECT = 9 / 19.5;

/** Pixels per design unit on a W×H canvas. 1000u ≈ the width of a phone-shaped canvas. */
export function baseUnit(width: number, height: number): number {
  return Math.min(width, height * REFERENCE_ASPECT) / 1000;
}

/** Element with this output's overrides applied. */
export function resolveElement<T extends StudioElement>(slide: Slide, element: T, outputId: string | null): T {
  if (!outputId) return element;
  const patch = slide.overrides[outputId]?.[element.id];
  return patch ? ({ ...element, ...patch } as T) : element;
}

export function resolveElements(slide: Slide, outputId: string | null): StudioElement[] {
  return slide.elements.map((element) => resolveElement(slide, element, outputId));
}

export function hasOverride(slide: Slide, elementId: string, outputId: string | null): boolean {
  if (!outputId) return false;
  const patch = slide.overrides[outputId]?.[elementId];
  return Boolean(patch && Object.keys(patch).length > 0);
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function outputAspect(output: OutputSpec): number {
  return output.width / output.height;
}

/** Hex helpers shared by renderers. Accepts #RGB, #RRGGBB, #RRGGBBAA. */
export function hexToRgba(hex: string, alphaMultiplier = 1): string {
  let value = hex.replace('#', '').trim();
  if (value.length === 3) value = value.split('').map((c) => c + c).join('');
  const r = parseInt(value.slice(0, 2), 16) || 0;
  const g = parseInt(value.slice(2, 4), 16) || 0;
  const b = parseInt(value.slice(4, 6), 16) || 0;
  const a = value.length >= 8 ? (parseInt(value.slice(6, 8), 16) || 0) / 255 : 1;
  return `rgba(${r}, ${g}, ${b}, ${+(a * alphaMultiplier).toFixed(4)})`;
}
