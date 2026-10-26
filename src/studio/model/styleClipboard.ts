import type { Draft } from 'immer';
import { create } from 'zustand';
import type { Background, Slide, StudioElement } from './types';

/**
 * Copy / paste / apply-to-all for looks. A style is everything about an element except what it says or shows, where
 * it sits and whether it's hidden or locked — the same split the "Sync style" toggle uses.
 */
const NOT_STYLE = new Set(['id', 'type', 'name', 'role', 'text', 'screen', 'assetId', 'visible', 'locked', 'x', 'y']);

export interface ElementStyle { type: StudioElement['type']; label: string; props: Record<string, unknown> }
export interface SlideStyle { background: Background; elements: Record<string, ElementStyle> }

interface StyleClipboard { element: ElementStyle | null; slide: SlideStyle | null; background: Background | null }
export const useStyleClipboard = create<StyleClipboard>(() => ({ element: null, slide: null, background: null }));

/** What people call the element in menus: "title", "phone", "image"… */
export function kindLabel(element: StudioElement): string {
  if (element.type === 'text') return element.role === 'title' ? 'title' : element.role === 'subtitle' ? 'subtitle' : element.role === 'badge' ? 'badge' : 'text';
  return element.type === 'device' ? 'phone' : element.type;
}

export function styleOf(element: StudioElement): ElementStyle {
  const props: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(element)) if (!NOT_STYLE.has(key)) props[key] = structuredClone(value);
  return { type: element.type, label: kindLabel(element), props };
}

export function canPaste(style: ElementStyle | null, element: StudioElement) {
  return Boolean(style && style.type === element.type);
}

export function pasteStyle(target: Draft<StudioElement>, style: ElementStyle) {
  if (target.type !== style.type) return;
  for (const [key, value] of Object.entries(style.props)) (target as unknown as Record<string, unknown>)[key] = structuredClone(value);
}

/**
 * Elements match across screenshots by kind and order: the second phone on one screenshot is the second phone on
 * every other, a title is a title. Shapes and images match by kind and order too.
 */
function matchKey(slide: Slide, element: StudioElement) {
  const kind = element.type === 'text' ? `text:${element.role}` : element.type;
  const index = slide.elements.filter((item) => (item.type === 'text' ? `text:${item.role}` : item.type) === kind).findIndex((item) => item.id === element.id);
  return `${kind}#${index}`;
}

export function counterpart<T extends Slide | Draft<Slide>>(source: Slide, element: StudioElement, other: T): T['elements'][number] | undefined {
  const key = matchKey(source, element);
  return other.elements.find((item) => matchKey(other as Slide, item as StudioElement) === key);
}

export function slideStyleOf(slide: Slide, resolve: (element: StudioElement) => StudioElement = (element) => element): SlideStyle {
  const elements: Record<string, ElementStyle> = {};
  for (const element of slide.elements) elements[matchKey(slide, element)] = styleOf(resolve(element));
  return { background: structuredClone(slide.background), elements };
}

export function pasteSlideStyle(target: Draft<Slide>, style: SlideStyle) {
  target.background = structuredClone(style.background);
  for (const element of target.elements) {
    const copied = style.elements[matchKey(target as Slide, element as StudioElement)];
    if (copied) pasteStyle(element, copied);
  }
}
