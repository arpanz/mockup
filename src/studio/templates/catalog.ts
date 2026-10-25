import { createDevice, createShape, createText, makeId, solid } from '../model/defaults';
import type { Background, DeviceElement, Project, Slide, StudioElement, TextElement } from '../model/types';

/**
 * How text and device sit on each slide.
 * - classic: headline on top, device below with a slight bottom bleed
 * - bleed: oversized device cropped by the bottom edge
 * - flip: alternates text-top/device-bottom with device-top/text-bottom
 * - offset: editorial left-aligned type, device pushed right
 * - tilt / duo / panorama: perspective, two devices, or devices crossing slide boundaries
 */
type Layout = 'classic' | 'bleed' | 'flip' | 'offset' | 'tilt' | 'duo' | 'panorama';

export interface TemplateCopy { title: string; subtitle: string }
export interface Template {
  id: string; name: string;
  category: 'Minimal' | 'Bold' | 'Dark' | 'Playful' | 'Editorial' | 'Panorama';
  description: string;
  build: (screens: Array<string | null>, copy: TemplateCopy[]) => { slides: Slide[]; span: Project['span'] };
  defaultCopy: TemplateCopy[];
}

const copy: TemplateCopy[] = [
  { title: 'Make room for *what matters*', subtitle: 'A simpler way to get your best work done.' },
  { title: 'Your day, in *focus*', subtitle: 'Every detail in its place. Every moment yours.' },
  { title: 'Small steps. *Big momentum.*', subtitle: 'Build a rhythm that keeps you moving.' },
  { title: 'See the *whole picture*', subtitle: 'Clear insights make confident decisions.' },
  { title: 'A better way to *begin*', subtitle: 'Everything you need, right where you need it.' },
];

type Style = { bg: Background; ink: string; muted: string; accent: string; font?: string; weight?: number; size?: number; device?: Partial<ReturnType<typeof createDevice>>; align?: 'left' | 'center'; titleY?: number; titleW?: number; subtitleY?: number; extras?: (i: number) => StudioElement[]; layout?: Layout; accentStyle?: TextElement['accent']['style'] };
const linear = (a: string, b: string, angle = 150): Background => ({ kind: 'linear', angle, stops: [{ color: a, position: 0 }, { color: b, position: 1 }], noise: 0.08 });
const mesh = (base: string, colors: string[]): Background => ({ kind: 'mesh', base, points: colors.map((color, i) => ({ x: [0.2, 0.82, 0.52][i], y: [0.18, 0.48, 0.88][i], color, radius: 0.58 })), noise: 0.12 });
const solidBg = (color: string): Background => ({ kind: 'solid', color, noise: 0.04 });
const configs: Array<{ id: string; name: string; category: Template['category']; description: string; style: Style; }> = [
  { id: 'clean-center', name: 'Clean Center', category: 'Minimal', description: 'Quiet gradients, confident type, and a device that takes center stage.', style: { layout: 'classic', bg: linear('#F5F3FF', '#FFFFFF', 180), ink: '#18181B', muted: '#52525B', accent: '#6366F1' } },
  { id: 'soft-pastel', name: 'Soft Pastel', category: 'Minimal', description: 'Airy mesh color and friendly rounded typography.', style: { layout: 'bleed', bg: mesh('#FFFDF9', ['#FBCFE8', '#C4B5FD', '#A7F3D0']), ink: '#29233B', muted: '#655D73', accent: '#8B5CF6', font: 'Nunito', weight: 800, device: { style: 'clay', tint: '#E6DDFB' } } },
  { id: 'mono', name: 'Mono', category: 'Minimal', description: 'A crisp monochrome system with beautifully restrained frames.', style: { layout: 'flip', bg: solidBg('#F4F4F5'), ink: '#09090B', muted: '#52525B', accent: '#27272A', font: 'Inter Tight', weight: 800, device: { style: 'outline', tint: '#27272A' } } },
  { id: 'big-type', name: 'Big Type', category: 'Bold', description: 'Oversized condensed headlines meet saturated color.', style: { layout: 'bleed', accentStyle: 'underline', bg: linear('#F97316', '#EC4899', 135), ink: '#FFFFFF', muted: '#FFF7ED', accent: '#FDE047', font: 'Anton', weight: 400, size: 120, titleY: 0.16, } },
  { id: 'color-block', name: 'Color Block', category: 'Bold', description: 'Graphic color fields and bold, clean contrast.', style: { layout: 'flip', accentStyle: 'highlight', bg: solidBg('#4F46E5'), ink: '#FFFFFF', muted: '#E0E7FF', accent: '#A5F3FC', font: 'Archivo Black', weight: 400, } },
  { id: 'tilted', name: 'Tilted', category: 'Bold', description: 'A little perspective adds instant motion and depth.', style: { layout: 'tilt', bg: mesh('#F8FAFC', ['#C7D2FE', '#FDA4AF', '#BAE6FD']), ink: '#111827', muted: '#4B5563', accent: '#4F46E5', device: { tiltY: -12, tiltX: 5, rotation: -3 } } },
  { id: 'midnight', name: 'Midnight', category: 'Dark', description: 'Deep atmospheric color with polished titanium hardware.', style: { layout: 'bleed', accentStyle: 'gradient', bg: mesh('#080B18', ['#312E81', '#155E75', '#4338CA']), ink: '#F8FAFC', muted: '#CBD5E1', accent: '#67E8F9', device: { finish: 'black-titanium' } } },
  { id: 'neon', name: 'Neon', category: 'Dark', description: 'Electric accents glow against a cinematic dark canvas.', style: { layout: 'classic', accentStyle: 'gradient', bg: mesh('#09090B', ['#701A75', '#312E81', '#BE185D']), ink: '#FAFAFA', muted: '#D4D4D8', accent: '#E879F9', device: { finish: 'black-titanium', glare: 0.18 } } },
  { id: 'premium', name: 'Premium', category: 'Dark', description: 'Navy, warm gold, and expressive serif typography.', style: { layout: 'classic', accentStyle: 'italic-serif', bg: mesh('#0C1424', ['#1E3A5F', '#7C5B32', '#172554']), ink: '#FFF9ED', muted: '#D6D3D1', accent: '#E9C982', font: 'DM Serif Display', weight: 400, device: { finish: 'natural-titanium' } } },
  { id: 'sticker', name: 'Sticker', category: 'Playful', description: 'Joyful stickers and color pops bring the feature story to life.', style: { layout: 'classic', accentStyle: 'highlight', bg: linear('#FEF3C7', '#FCE7F3'), ink: '#3B2442', muted: '#73566D', accent: '#EC4899', font: 'Fredoka', weight: 700, extras: (i) => [createShape('star', { name: 'Sticker star', x: i % 2 ? 0.81 : 0.2, y: 0.48, w: 180, h: 180, fill: solid(i % 2 ? '#FBBF24' : '#FB7185'), rotation: 12 }), createText('badge', { name: 'New sticker', text: 'NEW', x: 0.79, y: 0.31, rotation: 10, fill: solid('#FFFFFF'), plate: { enabled: true, paint: solid('#EC4899'), radius: 999, padX: 22, padY: 12, stroke: { enabled: false, width: 0, color: '#FFFFFF', opacity: 0 } } })] } },
  { id: 'bubbly', name: 'Bubbly', category: 'Playful', description: 'Soft blobs and a tinted clay device make features feel friendly.', style: { layout: 'bleed', bg: mesh('#F0FDFA', ['#99F6E4', '#FBCFE8', '#BFDBFE']), ink: '#134E4A', muted: '#3F6B69', accent: '#0F766E', font: 'Quicksand', weight: 700, device: { style: 'clay', tint: '#BFE8E1' }, extras: () => [createShape('blob', { x: 0.12, y: 0.45, w: 300, h: 330, fill: solid('#F9A8D4'), rotation: 24 }), createShape('ellipse', { x: 0.88, y: 0.61, w: 210, h: 210, fill: solid('#A5B4FC') })] } },
  { id: 'duo', name: 'Duo', category: 'Playful', description: 'Two overlapping screens tell a richer product story.', style: { layout: 'duo', bg: linear('#EEF2FF', '#FCE7F3'), ink: '#1E1B4B', muted: '#5B5878', accent: '#7C3AED', device: { x: 0.42, y: 0.68, h: 0.62, rotation: -7 }, extras: () => [createDevice({ name: 'Second device', x: 0.68, y: 0.71, h: 0.57, rotation: 7, style: 'real', finish: 'white-titanium', shadow: { enabled: true, x: 0, y: 22, blur: 55, spread: 0, color: '#312E81', opacity: 0.2 } })] } },
  { id: 'magazine', name: 'Magazine', category: 'Editorial', description: 'Left aligned editorial typography with a graceful serif accent.', style: { layout: 'offset', accentStyle: 'italic-serif', bg: solidBg('#F5F1EA'), ink: '#24211D', muted: '#70685F', accent: '#A54A35', font: 'Instrument Serif', weight: 400, align: 'left', titleY: 0.15, titleW: 0.84, titleSize: 86 } as Style },
  { id: 'swiss', name: 'Swiss', category: 'Editorial', description: 'A measured grid, precise grotesk type, and disciplined spacing.', style: { layout: 'flip', bg: { kind: 'pattern', patternId: 'grid', base: '#F4F4F1', colors: ['#D4D4D0'], scale: 1, noise: 0.02 }, ink: '#18181B', muted: '#52525B', accent: '#DC2626', font: 'Inter Tight', weight: 750, align: 'left', titleY: 0.14, titleW: 0.84 } },
  { id: 'quote', name: 'Quote', category: 'Editorial', description: 'A testimonial led opening with proof and a composed device reveal.', style: { layout: 'classic', accentStyle: 'italic-serif', bg: linear('#FFF7ED', '#FDE2D5'), ink: '#292524', muted: '#78716C', accent: '#EA580C', font: 'Playfair Display', weight: 600, titleY: 0.18, extras: (i) => [createText('caption', { name: 'Customer rating', text: i === 0 ? '★★★★★  4.9  •  Loved by 2M+' : '★★★★★  •  Made for everyday', y: 0.30, fontSize: 23, fill: solid('#B45309') })] } },
  { id: 'panorama-flow', name: 'Panorama Flow', category: 'Panorama', description: 'One continuous canvas with screens crossing every boundary.', style: { layout: 'panorama', bg: mesh('#F3F0FF', ['#C4B5FD', '#FBCFE8', '#A5F3FC']), ink: '#211A39', muted: '#5E5671', accent: '#6D28D9', } },
  { id: 'panorama-tilt', name: 'Panorama Tilt', category: 'Panorama', description: 'A kinetic gallery of tilted screens woven across the canvas.', style: { layout: 'panorama', bg: mesh('#111827', ['#3730A3', '#0E7490', '#7E22CE']), ink: '#FFFFFF', muted: '#CBD5E1', accent: '#67E8F9', device: { tiltY: -14, tiltX: 4, finish: 'black-titanium' } } },
  { id: 'gradient-ribbon', name: 'Gradient Ribbon', category: 'Panorama', description: 'A flowing ribbon of blurred color ties each frame together.', style: { layout: 'panorama', bg: mesh('#FFF7F0', ['#FB7185', '#A78BFA', '#38BDF8']), ink: '#241B31', muted: '#64576C', accent: '#7C3AED', extras: (i) => [createShape('ellipse', { name: 'Ribbon glow', x: 0.2 + (i % 2) * 0.6, y: 0.48, w: 850, h: 470, fill: { kind: 'linear', angle: 35, stops: [{ color: '#F472B6B8', position: 0 }, { color: '#818CF8A6', position: 0.5 }, { color: '#38BDF899', position: 1 }] }, blur: 55 })] } },
];

function build(config: typeof configs[number], screens: Array<string | null>, copyItems: TemplateCopy[]) {
  const { style, id } = config;
  const layout: Layout = style.layout ?? 'classic';
  const spanning = layout === 'panorama';
  const gradientAccent = { kind: 'linear' as const, angle: 90, stops: [{ color: style.accent, position: 0 }, { color: style.ink === '#FFFFFF' || style.ink.startsWith('#F') ? '#FFFFFF' : style.ink, position: 1 }] };

  const slides = Array.from({ length: Math.max(1, copyItems.length) }, (_, i): Slide => {
    const text = copyItems[i] ?? copy[i % copy.length];
    // Flip layouts put the text under the device on every other slide.
    const textBelow = layout === 'flip' && i % 2 === 1;
    const left = style.align === 'left' || layout === 'offset';
    const titleW = style.titleW ?? (left ? 0.84 : 0.86);
    const titleX = left ? 0.08 + titleW / 2 : 0.5;
    const titleY = textBelow ? 0.79 : style.titleY ?? (layout === 'bleed' ? 0.115 : 0.125);
    const subtitleY = textBelow ? titleY + 0.1 : style.subtitleY ?? titleY + 0.105;

    const title = createText('title', {
      text: text.title, x: titleX, y: titleY, w: titleW,
      fontFamily: style.font ?? 'Inter', fontWeight: style.weight ?? 800,
      fontSize: style.size ?? (style as Style & { titleSize?: number }).titleSize ?? 76,
      align: left ? 'left' : 'center', fill: solid(style.ink),
      accent: { style: style.accentStyle ?? 'color', color: style.accent, paint: gradientAccent, textColor: style.ink === '#FFFFFF' ? '#111827' : '#FFFFFF' },
    });
    const subtitle = createText('subtitle', {
      text: text.subtitle, x: left ? 0.08 + 0.4 : 0.5, y: subtitleY, w: left ? 0.8 : 0.8,
      align: left ? 'left' : 'center', fontFamily: 'Inter', fontWeight: 500, fontSize: 32, fill: solid(style.muted),
    });

    const screen = { assetId: screens[i] ?? null, fit: 'cover' as const, position: 'top' as const, background: '#FFFFFF' };
    const shadow = { enabled: true, x: 0, y: 28, blur: 68, spread: 0, color: style.ink === '#FFFFFF' || style.ink.startsWith('#F') ? '#000000' : style.ink, opacity: 0.22 };
    const placement: Partial<DeviceElement> = (() => {
      switch (layout) {
        case 'bleed': return { x: 0.5, y: 0.76, h: 0.84 };
        case 'flip': return textBelow ? { x: 0.5, y: 0.29, h: 0.8 } : { x: 0.5, y: 0.71, h: 0.8 };
        case 'offset': return { x: 0.6, y: 0.72, h: 0.74, rotation: 4 };
        case 'panorama': return { x: i % 2 === 0 ? 0.94 : 0.06, y: 0.66, h: 0.66 };
        default: return { x: 0.5, y: 0.69, h: 0.68 };
      }
    })();
    const device = createDevice({ ...placement, ...style.device, screen, shadow });
    const extras = style.extras?.(i) ?? [];
    const elements: StudioElement[] = [...extras, device, title, subtitle];
    return { id: makeId(), name: `${config.name} ${i + 1}`, background: style.bg, elements, overrides: {} };
  });
  return { slides, span: { enabled: spanning, background: style.bg } };
}

export const TEMPLATES: Template[] = configs.map((config) => ({ ...config, defaultCopy: copy, build: (screens, copyItems) => build(config, screens, copyItems) }));
