import { DEFAULT_OUTPUT_IDS, OUTPUT_CATALOG } from './outputs';
import type {
  Background,
  DeviceElement,
  ImageElement,
  Paint,
  Project,
  ShapeElement,
  Shadow,
  Slide,
  Stroke,
  TextElement,
} from './types';

export const makeId = () => Math.random().toString(36).slice(2, 10);

export const solid = (color: string): Paint => ({ kind: 'solid', color });

export const noShadow = (): Shadow => ({ enabled: false, x: 0, y: 12, blur: 40, spread: 0, color: '#000000', opacity: 0.25 });
export const noStroke = (): Stroke => ({ enabled: false, width: 2, color: '#000000', opacity: 1 });

export const defaultBackground = (): Background => ({
  kind: 'linear',
  angle: 180,
  stops: [
    { color: '#EEF2FF', position: 0 },
    { color: '#FFFFFF', position: 1 },
  ],
  noise: 0,
});

export function createText(role: TextElement['role'], patch: Partial<TextElement> = {}): TextElement {
  const presets: Record<TextElement['role'], Partial<TextElement>> = {
    title: { text: 'Your work,\n*beautifully* organized', fontSize: 78, fontWeight: 800, lineHeight: 1.08, letterSpacing: -0.02, y: 0.12, w: 0.86 },
    subtitle: { text: 'Everything you need to move from idea to impact.', fontSize: 34, fontWeight: 500, lineHeight: 1.35, letterSpacing: 0, y: 0.215, w: 0.78 },
    caption: { text: 'Caption', fontSize: 26, fontWeight: 600, lineHeight: 1.3, letterSpacing: 0, y: 0.5, w: 0.6 },
    badge: { text: 'NEW', fontSize: 22, fontWeight: 800, lineHeight: 1, letterSpacing: 0.08, y: 0.05, w: 0.5, transform: 'uppercase' },
  };
  const base: TextElement = {
    id: makeId(),
    type: 'text',
    role,
    name: role === 'title' ? 'Title' : role === 'subtitle' ? 'Subtitle' : role === 'badge' ? 'Badge' : 'Text',
    visible: true,
    locked: false,
    x: 0.5,
    y: 0.5,
    rotation: 0,
    opacity: 1,
    shadow: noShadow(),
    text: 'Text',
    w: 0.8,
    fontFamily: 'Inter',
    fontWeight: 600,
    fontSize: 40,
    lineHeight: 1.2,
    letterSpacing: 0,
    align: 'center',
    transform: 'none',
    fill: solid(role === 'subtitle' ? '#475569' : '#0F172A'),
    accent: {
      style: 'color',
      color: '#4F46E5',
      paint: { kind: 'linear', angle: 90, stops: [{ color: '#6366F1', position: 0 }, { color: '#EC4899', position: 1 }] },
      textColor: '#FFFFFF',
    },
    stroke: noStroke(),
    plate: {
      enabled: role === 'badge',
      paint: solid('#4F46E5'),
      radius: 999,
      padX: 18,
      padY: 10,
      stroke: noStroke(),
    },
  };
  const merged = { ...base, ...presets[role], ...patch };
  if (role === 'badge' && !patch.fill) merged.fill = solid('#FFFFFF');
  return merged;
}

export function createDevice(patch: Partial<DeviceElement> = {}): DeviceElement {
  return {
    id: makeId(),
    type: 'device',
    name: 'Device',
    visible: true,
    locked: false,
    x: 0.5,
    y: 0.66,
    rotation: 0,
    opacity: 1,
    shadow: { enabled: true, x: 0, y: 30, blur: 70, spread: 0, color: '#0F172A', opacity: 0.22 },
    model: 'auto',
    h: 0.72,
    style: 'real',
    finish: 'default',
    tint: '#E5E7EB',
    orientation: 'portrait',
    screen: { assetId: null, fit: 'cover', position: 'top', background: '#FFFFFF' },
    tiltX: 0,
    tiltY: 0,
    perspective: 2400,
    showButtons: true,
    glare: 0,
    ...patch,
  };
}

export function createImage(assetId: string, w: number, h: number, patch: Partial<ImageElement> = {}): ImageElement {
  return {
    id: makeId(),
    type: 'image',
    name: 'Image',
    visible: true,
    locked: false,
    x: 0.5,
    y: 0.5,
    rotation: 0,
    opacity: 1,
    shadow: noShadow(),
    assetId,
    w,
    h,
    fit: 'cover',
    radius: 0,
    stroke: noStroke(),
    ...patch,
  };
}

export function createShape(shape: ShapeElement['shape'], patch: Partial<ShapeElement> = {}): ShapeElement {
  return {
    id: makeId(),
    type: 'shape',
    name: shape === 'ellipse' ? 'Circle' : shape === 'rect' ? 'Rectangle' : shape === 'star' ? 'Star' : 'Blob',
    visible: true,
    locked: false,
    x: 0.5,
    y: 0.5,
    rotation: 0,
    opacity: 1,
    shadow: noShadow(),
    shape,
    w: 240,
    h: 240,
    radius: 32,
    fill: solid('#C7D2FE'),
    stroke: noStroke(),
    blur: 0,
    ...patch,
  };
}

export function createSlide(patch: Partial<Slide> = {}): Slide {
  return {
    id: makeId(),
    name: 'Screenshot',
    background: defaultBackground(),
    elements: [createText('title'), createText('subtitle'), createDevice()],
    overrides: {},
    ...patch,
  };
}

const STARTER_COPY = [
  { title: 'Your work,\n*beautifully* organized', subtitle: 'Everything you need to move from idea to impact.' },
  { title: 'Stay on top of\n*what matters*', subtitle: 'Smart reminders keep every task on track.' },
  { title: 'Built for\n*your flow*', subtitle: 'Fast, focused and ready wherever you are.' },
];

export function createProject(): Project {
  return {
    version: 2,
    id: makeId(),
    name: 'Untitled project',
    outputs: OUTPUT_CATALOG.filter((output) => DEFAULT_OUTPUT_IDS.includes(output.id)),
    slides: STARTER_COPY.map((copy, index) => {
      const slide = createSlide({ name: `Screenshot ${index + 1}` });
      for (const element of slide.elements) {
        if (element.type === 'text' && element.role === 'title') element.text = copy.title;
        if (element.type === 'text' && element.role === 'subtitle') element.text = copy.subtitle;
      }
      return slide;
    }),
    assets: {},
    span: { enabled: false, background: defaultBackground() },
    updatedAt: Date.now(),
  };
}
