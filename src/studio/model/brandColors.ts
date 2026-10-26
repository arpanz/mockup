import type { Draft } from 'immer';
import type { Background, Paint, Project, StudioElement } from './types';

type RGB = { r: number; g: number; b: number };

function rgbToHsl({ r, g, b }: RGB) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (delta) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  const parts = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return { r: Math.round((parts[0] + m) * 255), g: Math.round((parts[1] + m) * 255), b: Math.round((parts[2] + m) * 255) };
}

function hexOf({ r, g, b }: RGB) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function parseHex(color: string): { rgb: RGB; alpha: string } | null {
  const match = /^#([\da-f]{6})([\da-f]{2})?$/i.exec(color);
  if (!match) return null;
  const value = match[1];
  return { rgb: { r: parseInt(value.slice(0, 2), 16), g: parseInt(value.slice(2, 4), 16), b: parseInt(value.slice(4, 6), 16) }, alpha: match[2] ?? '' };
}

function luminance({ r, g, b }: RGB) {
  const [lr, lg, lb] = [r, g, b].map((value) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** Rough luminance of what the headline sits on; null when it can't be known (photos). */
function backgroundLuminance(background: Background): number | null {
  const colors = background.kind === 'solid' ? [background.color]
    : background.kind === 'linear' || background.kind === 'radial' ? background.stops.map((stop) => stop.color)
    : background.kind === 'mesh' ? [background.base, ...background.points.map((point) => point.color)]
    : background.kind === 'pattern' ? [background.base]
    : [];
  const values = colors.flatMap((color) => {
    const parsed = parseHex(color);
    return parsed ? [luminance(parsed.rgb)] : [];
  });
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

/** The brand color as given when it reads on the background, otherwise the nearest lighter or darker shade that does. */
function readableOn(brand: string, backdrop: number | null) {
  const parsed = parseHex(brand);
  if (!parsed || backdrop === null) return brand;
  const hsl = rgbToHsl(parsed.rgb);
  const step = backdrop > 0.4 ? -0.03 : 0.03;
  let rgb = parsed.rgb;
  for (let l = hsl.l; l >= 0.08 && l <= 0.94 && contrast(luminance(rgb), backdrop) < 3; l += step) rgb = hslToRgb(hsl.h, hsl.s, l);
  return hexOf(rgb);
}

function rehue(color: string, hue: number) {
  const parsed = parseHex(color);
  if (!parsed) return color;
  const hsl = rgbToHsl(parsed.rgb);
  if (hsl.s < 0.12) return color;
  return `${hexOf(hslToRgb(hue, hsl.s, hsl.l))}${parsed.alpha}`;
}

function paint(paint: Paint, hue: number) {
  if (paint.kind === 'solid') paint.color = rehue(paint.color, hue);
  else for (const stop of paint.stops) stop.color = rehue(stop.color, hue);
}

function background(background: Background, hue: number) {
  switch (background.kind) {
    case 'solid': background.color = rehue(background.color, hue); break;
    case 'linear':
    case 'radial': background.stops.forEach((stop) => { stop.color = rehue(stop.color, hue); }); break;
    case 'mesh':
      background.base = rehue(background.base, hue);
      background.points.forEach((point) => { point.color = rehue(point.color, hue); });
      break;
    case 'pattern':
      background.base = rehue(background.base, hue);
      background.colors = background.colors.map((color) => rehue(color, hue));
      break;
    case 'image': background.overlay = rehue(background.overlay, hue); break;
  }
}

function transformElement(element: Partial<StudioElement> & Record<string, unknown>, hue: number, brand: string) {
  const fill = element.fill as Paint | undefined;
  if (fill) paint(fill, hue);
  const accent = element.accent as { color?: string; paint?: Paint; style?: string; textColor?: string } | undefined;
  if (accent) {
    if (accent.color !== undefined) accent.color = brand;
    if (accent.paint) paint(accent.paint, hue);
    if (accent.style === 'highlight' && accent.textColor !== undefined) {
      const parsed = parseHex(brand);
      if (parsed) accent.textColor = luminance(parsed.rgb) > 0.6 ? '#111827' : '#FFFFFF';
    }
  }
  const plate = element.plate as { paint?: Paint } | undefined;
  if (plate?.paint) paint(plate.paint, hue);
  if (element.type === 'device' || 'tint' in element) {
    const device = element as { style?: string; tint?: string };
    if ((device.style === 'clay' || device.style === 'matte') && device.tint) device.tint = rehue(device.tint, hue);
  }
}

/**
 * Luminance behind each slide's headline where the background is an image, so applyBrandColor can keep accents
 * readable on illustrated and photo backgrounds too. Samples a band of the image around the first headline.
 */
export async function measureImageBackdrops(project: Project): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  await Promise.all(project.slides.map(async (slide) => {
    const background = project.span.enabled ? project.span.background : slide.background;
    if (background.kind !== 'image') return;
    const src = project.assets[background.assetId]?.src;
    if (!src) return;
    try {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 24;
      canvas.height = 48;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const headline = slide.elements.find((element) => element.type === 'text' && element.visible);
      const center = headline ? Math.min(0.95, Math.max(0.05, headline.y)) : 0.15;
      const top = Math.max(0, Math.round((center - 0.08) * canvas.height));
      const rows = Math.max(1, Math.round(0.16 * canvas.height));
      const pixels = context.getImageData(0, top, canvas.width, Math.min(rows, canvas.height - top)).data;
      let sum = 0;
      for (let i = 0; i < pixels.length; i += 4) sum += luminance({ r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] });
      result[slide.id] = sum / (pixels.length / 4);
    } catch { /* Unreadable image: keep the brand color as given. */ }
  }));
  return result;
}

export function applyBrandColor(draft: Draft<Project>, hex: string, imageBackdrops: Record<string, number> = {}): void {
  const parsed = parseHex(hex);
  if (!parsed) return;
  const hue = rgbToHsl(parsed.rgb).h;
  background(draft.span.background, hue);
  for (const slide of draft.slides) {
    background(slide.background, hue);
    // Highlighted words keep the exact brand color only where it stays readable on this slide.
    const backdrop = backgroundLuminance(draft.span.enabled ? draft.span.background : slide.background) ?? imageBackdrops[slide.id] ?? null;
    const brand = readableOn(hex.toUpperCase(), backdrop);
    for (const element of slide.elements) transformElement(element, hue, brand);
    for (const overrides of Object.values(slide.overrides)) {
      for (const override of Object.values(overrides)) transformElement(override as Partial<StudioElement> & Record<string, unknown>, hue, brand);
    }
  }
}

export async function extractPalette(sources: string[], max = 6): Promise<string[]> {
  const bins = Array.from({ length: 24 }, () => ({ weight: 0, count: 0, r: 0, g: 0, b: 0 }));
  for (const source of sources) {
    try {
      const image = new Image();
      image.src = source;
      await image.decode();
      const height = 64;
      const width = Math.max(1, Math.round(image.width * height / image.height));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) continue;
      context.drawImage(image, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height).data;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] < 200) continue;
        const rgb = { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] };
        const { h, l } = rgbToHsl(rgb);
        // Chroma, not HSL saturation: pastel tints score high on saturation but are not a brand color.
        const chroma = (Math.max(rgb.r, rgb.g, rgb.b) - Math.min(rgb.r, rgb.g, rgb.b)) / 255;
        if (chroma < 0.3 || l < 0.14 || l > 0.86) continue;
        const bin = bins[Math.min(23, Math.floor(h / 15))];
        const weight = chroma * chroma;
        bin.weight += weight;
        bin.count++;
        bin.r += rgb.r * weight;
        bin.g += rgb.g * weight;
        bin.b += rgb.b * weight;
      }
    } catch {
      continue;
    }
  }
  const picked: Array<{ hue: number; hex: string }> = [];
  for (const bin of bins.filter((item) => item.count).sort((a, b) => b.weight - a.weight)) {
    const color = { r: Math.round(bin.r / bin.weight), g: Math.round(bin.g / bin.weight), b: Math.round(bin.b / bin.weight) };
    const hue = rgbToHsl(color).h;
    if (picked.some((item) => Math.min(Math.abs(item.hue - hue), 360 - Math.abs(item.hue - hue)) < 18)) continue;
    picked.push({ hue, hex: hexOf(color) });
    if (picked.length >= max) break;
  }
  return picked.map((item) => item.hex);
}
