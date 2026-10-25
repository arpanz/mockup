import type { GradientStop, Paint, Shadow, Stroke } from '../model/types';
import { hexToRgba } from '../model/units';

const stopsCss = (stops: GradientStop[]) =>
  [...stops]
    .sort((a, b) => a.position - b.position)
    .map((stop) => `${hexToRgba(stop.color)} ${(stop.position * 100).toFixed(2)}%`)
    .join(', ');

/** CSS `background` value for a Paint. */
export function paintCss(paint: Paint): string {
  switch (paint.kind) {
    case 'solid':
      return hexToRgba(paint.color);
    case 'linear':
      return `linear-gradient(${paint.angle}deg, ${stopsCss(paint.stops)})`;
    case 'radial':
      return `radial-gradient(circle at ${(paint.cx * 100).toFixed(2)}% ${(paint.cy * 100).toFixed(2)}%, ${stopsCss(paint.stops)})`;
  }
}

export function shadowFilter(shadow: Shadow, unit: number): string | undefined {
  if (!shadow.enabled || shadow.opacity <= 0) return undefined;
  return `drop-shadow(${shadow.x * unit}px ${shadow.y * unit}px ${shadow.blur * unit}px ${hexToRgba(shadow.color, shadow.opacity)})`;
}

export function boxShadow(shadow: Shadow, unit: number): string | undefined {
  if (!shadow.enabled || shadow.opacity <= 0) return undefined;
  return `${shadow.x * unit}px ${shadow.y * unit}px ${shadow.blur * unit}px ${shadow.spread * unit}px ${hexToRgba(shadow.color, shadow.opacity)}`;
}

export function strokeCss(stroke: Stroke, unit: number): string | undefined {
  if (!stroke.enabled || stroke.width <= 0) return undefined;
  return `${stroke.width * unit}px solid ${hexToRgba(stroke.color, stroke.opacity)}`;
}
