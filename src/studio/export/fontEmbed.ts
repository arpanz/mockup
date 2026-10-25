import type { Project, TextElement } from '../model/types';
import { getFont } from '../text/fontCatalog';

/**
 * Builds the @font-face CSS that exported PNGs need, inlined as data URLs.
 *
 * html-to-image's own embedding inlines every face of every stylesheet in the document
 * (all weights × italics × unicode subsets), which means hundreds of downloads. We only
 * embed the families/weights the project's text uses, and only subsets its characters need.
 */

interface FaceRequest { family: string; weights: Set<number>; italic: Set<number> }

const cssCache = new Map<string, Promise<string>>();
const dataUrlCache = new Map<string, Promise<string>>();

function collectFaces(project: Project): { faces: FaceRequest[]; text: string } {
  const faces = new Map<string, FaceRequest>();
  let text = '';
  const want = (family: string, weight: number, italic: boolean) => {
    const font = getFont(family);
    if (!font || font.source === 'system') return;
    // Snap to the closest weight the family actually ships.
    const snapped = font.weights.reduce((best, w) => (Math.abs(w - weight) < Math.abs(best - weight) ? w : best), font.weights[0]);
    const face = faces.get(family) ?? { family, weights: new Set<number>(), italic: new Set<number>() };
    (italic && font.italic ? face.italic : face.weights).add(snapped);
    faces.set(family, face);
  };
  for (const slide of project.slides) {
    for (const element of slide.elements) {
      if (element.type !== 'text') continue;
      const textElement = element as TextElement;
      text += textElement.text;
      want(textElement.fontFamily, textElement.fontWeight, false);
      if (textElement.accent.style === 'italic-serif') want('Instrument Serif', 400, true);
    }
  }
  return { faces: [...faces.values()], text };
}

function cssUrl(face: FaceRequest): string {
  const family = encodeURIComponent(face.family).replaceAll('%20', '+');
  const upright = [...face.weights].sort((a, b) => a - b);
  // Families without an italic axis reject the ital,wght form, so only use it when needed.
  if (face.italic.size === 0) return `https://fonts.googleapis.com/css2?family=${family}:wght@${upright.join(';')}&display=block`;
  const tuples = [...upright.map((w) => `0,${w}`), ...[...face.italic].sort((a, b) => a - b).map((w) => `1,${w}`)];
  return `https://fonts.googleapis.com/css2?family=${family}:ital,wght@${tuples.join(';')}&display=block`;
}

function fetchText(url: string): Promise<string> {
  let task = cssCache.get(url);
  if (!task) {
    task = fetch(url).then((response) => (response.ok ? response.text() : ''));
    task.catch(() => cssCache.delete(url));
    cssCache.set(url, task);
  }
  return task;
}

function toDataUrl(url: string): Promise<string> {
  let task = dataUrlCache.get(url);
  if (!task) {
    task = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Font download failed: ${response.status}`);
        return response.blob();
      })
      .then((blob) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      }));
    task.catch(() => dataUrlCache.delete(url));
    dataUrlCache.set(url, task);
  }
  return task;
}

/** True when any character of `text` falls inside a CSS unicode-range list like "U+0000-00FF, U+0131". */
function coversText(range: string, codePoints: number[]): boolean {
  const spans = range.split(',').map((part) => {
    const [start, end] = part.trim().replace(/^U\+/i, '').split('-');
    if (start.includes('?')) {
      return [parseInt(start.replaceAll('?', '0'), 16), parseInt(start.replaceAll('?', 'F'), 16)];
    }
    const from = parseInt(start, 16);
    return [from, end ? parseInt(end, 16) : from];
  });
  return codePoints.some((cp) => spans.some(([from, to]) => cp >= from && cp <= to));
}

export async function buildFontEmbedCSS(project: Project): Promise<string> {
  const { faces, text } = collectFaces(project);
  const codePoints = [...new Set([...text].map((char) => char.codePointAt(0)!))].filter((cp) => cp > 0x7e);
  const sheets = await Promise.all(faces.map((face) => fetchText(cssUrl(face)).catch(() => '')));
  const blocks: string[] = [];
  for (const sheet of sheets) {
    // Google annotates each block with its subset: /* latin */ @font-face { ... }
    for (const match of sheet.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)) {
      const [, subset, block] = match;
      const range = /unicode-range:\s*([^;]+);/.exec(block)?.[1] ?? '';
      const basic = subset === 'latin' || subset === 'latin-ext';
      if (!basic && !(range && coversText(range, codePoints))) continue;
      blocks.push(block);
    }
  }
  const inlined = await Promise.all(blocks.map(async (block) => {
    const src = /url\((https:[^)]+)\)/.exec(block)?.[1];
    if (!src) return block;
    try {
      return block.replace(src, await toDataUrl(src));
    } catch {
      return '';
    }
  }));
  return inlined.filter(Boolean).join('\n');
}
