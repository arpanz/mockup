import { createDevice, createShape, createText, makeId, solid } from '../model/defaults';
import type { Asset, Background, DeviceElement, Project, Slide, StudioElement, TextElement } from '../model/types';

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
  category: 'Minimal' | 'Bold' | 'Dark' | 'Playful' | 'Editorial' | 'Illustrated' | 'Panorama';
  description: string;
  build: (screens: Array<string | null>, copy: TemplateCopy[]) => { slides: Slide[]; span: Project['span']; assets: Asset[] };
  defaultCopy: TemplateCopy[];
}

const copy: TemplateCopy[] = [
  { title: 'Make room for\n*what matters*', subtitle: 'A simpler way to get your best work done.' },
  { title: 'Your day,\nin *focus*', subtitle: 'Every detail in its place. Every moment yours.' },
  { title: 'Small steps.\n*Big moves.*', subtitle: 'Build a rhythm that keeps you moving.' },
  { title: 'See the\n*whole picture*', subtitle: 'Clear insights make confident decisions.' },
  { title: 'A better way\nto *begin*', subtitle: 'Everything you need, right where you need it.' },
];

/** Generated background art shipped in public/templates (prompts in ./ART.md). */
interface Art { file: string; width: number; height: number; overlay?: string }

interface Style {
  layout?: Layout;
  bg: Background;
  /** A different background per slide (Uber Eats style); otherwise every slide shares `bg`. */
  bgs?: Background[];
  /** Background art: one image per slide, or one image across the whole set for panorama layouts. */
  art?: Art;
  ink: string; muted: string; accent: string;
  accentStyle?: TextElement['accent']['style'];
  font?: string; weight?: number; size?: number; tracking?: number;
  /** Subtitle typeface; defaults to Inter. */
  body?: string; bodyWeight?: number; bodySize?: number;
  /** Per-slide text tweaks: a left-aligned slide in a centered set, or a device-only slide with no text. */
  textAt?: (i: number) => { align?: 'left' | 'center'; hidden?: boolean };
  /** A small numbered label above the headline ("01", "02"…). */
  eyebrow?: string;
  align?: 'left' | 'center';
  titleY?: number; titleW?: number; subtitleY?: number;
  /** false: the headline carries the slide alone. The subtitle is still created (hidden, one click to show) and the
   * device moves up into the room it leaves. */
  subtitle?: boolean;
  device?: Partial<DeviceElement>;
  /** Per-slide device tweaks layered over the layout, e.g. alternating tilt. */
  deviceAt?: (i: number) => Partial<DeviceElement>;
  extras?: (i: number, screens: Array<string | null>) => StudioElement[];
}

const linear = (a: string, b: string, angle = 150): Background => ({ kind: 'linear', angle, stops: [{ color: a, position: 0 }, { color: b, position: 1 }], noise: 0.08 });
const mesh = (base: string, colors: string[]): Background => ({ kind: 'mesh', base, points: colors.map((color, i) => ({ x: [0.2, 0.82, 0.52][i], y: [0.18, 0.48, 0.88][i], color, radius: 0.58 })), noise: 0.12 });
const solidBg = (color: string): Background => ({ kind: 'solid', color, noise: 0.04 });
const art = (file: string, overlay?: string, width = 1024, height = 1536): Art => ({ file, width, height, overlay });
const artAssetId = (file: string) => `template-art-${file}`;
const alternate = (a: Partial<DeviceElement>, b: Partial<DeviceElement>) => (i: number) => (i % 2 ? b : a);

/**
 * A different camera on every slide, like a hand-made store set: a straight phone cropped by the bottom edge,
 * two parallel phones turned clockwise, a left-aligned slide with one phone turned the other way, then a device-only close-up.
 */
const CAMERAS: Partial<DeviceElement>[] = [
  { x: 0.5, y: 0.73, h: 0.84 },
  { x: 0.24, y: 0.66, h: 0.66, rotation: 25 },
  { x: 0.6, y: 0.74, h: 0.66, rotation: -28, tiltX: 8 },
  { x: 0.56, y: 0.53, h: 1.06, rotation: 14 },
];
const cameraCycle = (tint: string): Pick<Style, 'deviceAt' | 'extras' | 'textAt'> => ({
  deviceAt: (i) => ({ ...CAMERAS[i % CAMERAS.length], style: 'minimal', tint }),
  // The pair: a parallel phone one phone-width (plus a gap) to the right, half off the edge, showing the next
  // screenshot. The two never overlap.
  extras: (i, screens) => i % CAMERAS.length !== 1 ? [] : [createDevice({
    name: 'Second device', x: 1.04, y: 0.66, h: 0.66, rotation: 25, style: 'minimal', tint,
    screen: { assetId: screens[(i + 1) % Math.max(1, screens.length)] ?? null, fit: 'cover', position: 'top', background: '#FFFFFF' },
    shadow: { enabled: true, x: 0, y: 28, blur: 68, spread: 0, color: '#000000', opacity: 0.22 },
  })],
  textAt: (i) => ({ align: i % CAMERAS.length === 2 ? 'left' : 'center', hidden: i % CAMERAS.length === 3 }),
});

const configs: Array<{ id: string; name: string; category: Template['category']; description: string; style: Style }> = [
  // ── Art-directed sets with generated backgrounds ──
  { id: 'aurora', name: 'Aurora', category: 'Dark', description: 'Northern-light ribbons over deep navy, with a gradient headline.', style: {
    layout: 'bleed', art: art('aurora-dark'), bg: solidBg('#070A16'), ink: '#FFFFFF', muted: '#C7D2FE', accent: '#7DD3FC', accentStyle: 'gradient',
    font: 'Inter Tight', weight: 700, size: 118, eyebrow: '#A5B4FC', device: { style: 'real', finish: 'black-titanium', glare: 0.12 } } },
  { id: 'clay-studio', name: 'Clay Studio', category: 'Playful', description: 'Soft 3D clay shapes and a matching clay phone, warm and tactile.', style: {
    layout: 'classic', art: art('clay-pastel'), bg: solidBg('#F6EFE6'), ink: '#3A2E2A', muted: '#6E5F57', accent: '#E07A5F',
    font: 'Fredoka', weight: 600, size: 120, body: 'Nunito', bodyWeight: 600, device: { style: 'clay', tint: '#F4E9DE', h: 0.66, y: 0.6 } } },
  { id: 'golden-hour', name: 'Golden Hour', category: 'Minimal', description: 'Warm sunset bokeh, elegant serif headlines and a glass frame.', style: {
    layout: 'bleed', art: art('golden-hour'), bg: solidBg('#F6C9A8'), ink: '#3B1F1A', muted: '#6B3F35', accent: '#B4472F', accentStyle: 'italic-serif',
    font: 'DM Serif Display', weight: 400, size: 128, tracking: -0.01, device: { style: 'glass', tint: '#FFFFFF' } } },
  { id: 'chrome', name: 'Chrome', category: 'Bold', description: 'Liquid iridescent chrome and crisp, confident type.', style: { subtitle: false,
    layout: 'tilt', art: art('chrome-iridescent'), bg: solidBg('#F4F3F8'), ink: '#14121A', muted: '#4B4759', accent: '#6D5DF6', accentStyle: 'gradient',
    font: 'Bricolage Grotesque', weight: 700, size: 108, body: 'Instrument Sans', titleY: 0.115, device: { style: 'minimal', tint: '#0B0B0F', tiltY: 20, tiltX: 10 } } },
  { id: 'spotlight', name: 'Spotlight', category: 'Dark', description: 'A single pool of light on charcoal, gold serif and titanium.', style: {
    layout: 'classic', art: art('spotlight-dark'), bg: solidBg('#0E0E10'), ink: '#F7F2EA', muted: '#B9B2A6', accent: '#D9B77C', accentStyle: 'italic-serif',
    font: 'Playfair Display', weight: 600, size: 116, eyebrow: '#D9B77C', device: { style: 'real', finish: 'natural-titanium', y: 0.66 } } },
  { id: 'paper', name: 'Paper', category: 'Editorial', description: 'Risograph paper, numbered sections and an editorial serif.', style: {
    layout: 'offset', art: art('paper-warm'), bg: solidBg('#F3EDE3'), ink: '#26201B', muted: '#6E6358', accent: '#B5532F', accentStyle: 'italic-serif',
    font: 'Instrument Serif', weight: 400, size: 136, tracking: -0.015, body: 'Instrument Sans', eyebrow: '#B5532F', align: 'left', titleW: 0.84,
    device: { style: 'minimal', tint: '#1C1814' }, deviceAt: alternate({ rotation: 4 }, { rotation: -3, x: 0.42 }) } },
  { id: 'sunlit', name: 'Sunlit', category: 'Minimal', description: 'Palm shadows on warm plaster for calm, wellness-y stories.', style: {
    layout: 'bleed', art: art('sunlit-leaves'), bg: solidBg('#EADFCF'), ink: '#2D281F', muted: '#655B4B', accent: '#5F7A45', accentStyle: 'italic-serif',
    font: 'Fraunces', weight: 600, size: 118, body: 'DM Sans', device: { style: 'clay', tint: '#F3ECE1' } } },
  { id: 'holo', name: 'Holo', category: 'Playful', description: 'Holographic pastel light with frosted glass and rounded type.', style: { subtitle: false,
    layout: 'bleed', art: art('holo-glass'), bg: solidBg('#EDE7FB'), ink: '#1D1640', muted: '#4C4470', accent: '#FFFFFF', accentStyle: 'highlight',
    font: 'Outfit', weight: 700, size: 120, body: 'Outfit', bodyWeight: 500, device: { style: 'glass', tint: '#FFFFFF' } } },
  { id: 'silk', name: 'Silk', category: 'Panorama', description: 'One sweep of silk across every screenshot, phones flowing between frames.', style: { subtitle: false,
    layout: 'panorama', art: art('silk-panorama', undefined, 1536, 1024), bg: solidBg('#1B1440'), ink: '#FFFFFF', muted: '#E9D5FF', accent: '#FDBA74',
    font: 'Outfit', weight: 700, size: 116, body: 'Outfit', bodyWeight: 400, device: { style: 'real', finish: 'black-titanium' } } },

  // ── Hand-composed sets: a different camera on every slide ──
  { id: 'sky', name: 'Sky', category: 'Bold', description: 'Sky-blue gradient, big rounded blue headlines and a new camera on every slide.', style: {
    layout: 'classic', bg: linear('#DDEFFF', '#4E9FEF', 172), ink: '#1F7FDB', muted: '#0E1B33', accent: '#1F7FDB',
    font: 'Fredoka', weight: 600, size: 142, body: 'Fredoka', bodyWeight: 600, bodySize: 76, titleY: 0.085, subtitleY: 0.2, ...cameraCycle('#0E0F12') } },
  { id: 'mint-night', name: 'Mint Night', category: 'Dark', description: 'Deep navy into green, mint headlines and a new camera on every slide.', style: {
    layout: 'classic', bg: linear('#0B1224', '#0B5A47', 172), ink: '#5EEAD4', muted: '#FFFFFF', accent: '#5EEAD4',
    font: 'Fredoka', weight: 600, size: 142, body: 'Fredoka', bodyWeight: 600, bodySize: 76, titleY: 0.085, subtitleY: 0.2, ...cameraCycle('#050608') } },
  { id: 'peach', name: 'Peach', category: 'Playful', description: 'Warm peach gradient, chunky rust headlines and a new camera on every slide.', style: {
    layout: 'classic', bg: linear('#FFF1E4', '#FB9A68', 172), ink: '#C2410C', muted: '#2A1408', accent: '#C2410C',
    font: 'Baloo 2', weight: 800, size: 142, body: 'Baloo 2', bodyWeight: 700, bodySize: 76, titleY: 0.085, subtitleY: 0.2, ...cameraCycle('#14100E') } },

  // ── Flat 2D illustrated backgrounds ──
  { id: 'bauhaus', name: 'Bauhaus', category: 'Illustrated', description: 'Bold primary shapes on cream paper, framed by a crisp black phone.', style: { subtitle: false,
    layout: 'classic', art: art('bauhaus'), bg: solidBg('#F2EAD8'), ink: '#161616', muted: '#4A4237', accent: '#D8402A',
    font: 'Archivo Black', weight: 400, size: 104, tracking: -0.01, body: 'Archivo', bodyWeight: 500, eyebrow: '#D8402A', device: { style: 'minimal', tint: '#161616', h: 0.7, y: 0.65 } } },
  { id: 'memphis', name: 'Memphis', category: 'Illustrated', description: 'Confetti squiggles on blush pink with a highlighter headline.', style: { subtitle: false,
    layout: 'classic', art: art('memphis'), bg: solidBg('#F9D9DC'), ink: '#2B1B3D', muted: '#6B5374', accent: '#FDE047', accentStyle: 'highlight',
    font: 'Unbounded', weight: 700, size: 96, body: 'DM Sans', bodyWeight: 500, device: { style: 'real', finish: 'white-titanium' } } },
  { id: 'cutout', name: 'Cut-Out', category: 'Illustrated', description: 'Matisse-style paper cut-outs and a painted cobalt phone.', style: {
    layout: 'bleed', art: art('cutout'), bg: solidBg('#F5EFE3'), ink: '#1D2B6B', muted: '#4C5683', accent: '#E8613C', accentStyle: 'italic-serif',
    font: 'Fraunces', weight: 700, size: 120, body: 'DM Sans', device: { style: 'matte', tint: '#2340A8' } } },
  { id: 'riso', name: 'Riso', category: 'Illustrated', description: 'Grainy risograph pink and blue with sharp grotesk type.', style: { subtitle: false,
    layout: 'classic', art: art('riso'), bg: solidBg('#F4EFEA'), ink: '#16162B', muted: '#4A4560', accent: '#FF2E93',
    font: 'Space Grotesk', weight: 700, size: 118, tracking: -0.02, body: 'Space Grotesk', bodyWeight: 500, eyebrow: '#FF2E93', device: { style: 'minimal', tint: '#16162B' } } },
  { id: 'hills', name: 'Hills', category: 'Illustrated', description: 'Layered sunrise hills in peach and plum, calm and warm.', style: {
    layout: 'classic', art: art('hills'), bg: solidBg('#FBDCC4'), ink: '#4A1F3D', muted: '#7A4A55', accent: '#D9653B',
    font: 'Lexend', weight: 700, size: 112, tracking: -0.02, body: 'Lexend', bodyWeight: 400, device: { style: 'clay', tint: '#FDEBDD', h: 0.64, y: 0.63 } } },
  { id: 'retro-stripes', name: 'Retro Stripes', category: 'Illustrated', description: 'A seventies rainbow sweep in rust and mustard with rounded type.', style: { subtitle: false,
    layout: 'classic', art: art('stripes'), bg: solidBg('#FBF1DF'), ink: '#3B2416', muted: '#6E5140', accent: '#D9622B',
    font: 'Baloo 2', weight: 800, size: 124, body: 'Nunito', bodyWeight: 600, device: { style: 'minimal', tint: '#3B2416', h: 0.64, y: 0.63 } } },
  { id: 'night-sky', name: 'Night Sky', category: 'Illustrated', description: 'A flat starry night over layered mountains, lit by a moon-gold accent.', style: { subtitle: false,
    layout: 'classic', art: art('night'), bg: solidBg('#0B1A4A'), ink: '#FFFFFF', muted: '#C7D2FE', accent: '#FDE68A',
    font: 'Sora', weight: 700, size: 112, body: 'DM Sans', device: { style: 'real', finish: 'black-titanium', glare: 0.1, h: 0.64, y: 0.63 } } },
  { id: 'topo', name: 'Topo', category: 'Illustrated', description: 'Cream contour lines on forest green for outdoorsy, grounded apps.', style: {
    layout: 'classic', art: art('topo'), bg: solidBg('#123524'), ink: '#F4EBD0', muted: '#C9D8C5', accent: '#E9C46A',
    font: 'Hanken Grotesk', weight: 800, size: 116, tracking: -0.02, eyebrow: '#E9C46A', device: { style: 'real', finish: 'natural-titanium' } } },

  // ── Systems built from gradients, mesh and patterns ──
  { id: 'clean-center', name: 'Clean Center', category: 'Minimal', description: 'Quiet gradients, confident type, and a device that takes center stage.', style: { layout: 'classic', bg: linear('#F5F3FF', '#FFFFFF', 180), ink: '#18181B', muted: '#52525B', accent: '#6366F1', font: 'Inter Tight', weight: 800 } },
  { id: 'soft-pastel', name: 'Soft Pastel', category: 'Minimal', description: 'Airy mesh color and friendly rounded typography.', style: { layout: 'bleed', bg: mesh('#FFFDF9', ['#FBCFE8', '#C4B5FD', '#A7F3D0']), ink: '#29233B', muted: '#655D73', accent: '#8B5CF6', font: 'Nunito', weight: 800, body: 'Nunito', bodyWeight: 600, device: { style: 'clay', tint: '#E6DDFB' } } },
  { id: 'mono', name: 'Mono', category: 'Minimal', description: 'A crisp monochrome system with beautifully restrained frames.', style: { layout: 'flip', bg: solidBg('#F4F4F5'), ink: '#09090B', muted: '#52525B', accent: '#27272A', font: 'Inter Tight', weight: 800, eyebrow: '#A1A1AA', device: { style: 'minimal', tint: '#0A0A0A' } } },
  { id: 'fresh', name: 'Fresh', category: 'Minimal', description: 'Bright brand color, left-aligned type and a crisp minimal frame.', style: { subtitle: false, layout: 'bleed', align: 'left', bg: solidBg('#25D366'), ink: '#0B0B0C', muted: '#0B3D1F', accent: '#FFFFFF', font: 'Inter Tight', weight: 800, size: 128, device: { style: 'minimal', tint: '#0B0B0C' } } },
  { id: 'frosted', name: 'Frosted', category: 'Minimal', description: 'Cool blue gradient with a soft frosted-glass frame.', style: { layout: 'bleed', bg: linear('#6A9BF4', '#2B4FD8', 180), ink: '#FFFFFF', muted: '#E0E7FF', accent: '#FFFFFF', font: 'Poppins', weight: 600, size: 116, body: 'Poppins', bodyWeight: 400, device: { style: 'glass', tint: '#FFFFFF' } } },
  { id: 'color-pop', name: 'Color Pop', category: 'Bold', description: 'A new saturated color every slide with clean frameless screens.', style: { subtitle: false, layout: 'bleed', bg: solidBg('#06C167'), bgs: [solidBg('#06C167'), solidBg('#FFD8CE'), solidBg('#FF6B35'), solidBg('#FFC043')], ink: '#111111', muted: '#2B2B2B', accent: '#111111', font: 'Outfit', weight: 600, size: 120, body: 'Outfit', bodyWeight: 400, device: { style: 'none' } } },
  { id: 'big-type', name: 'Big Type', category: 'Bold', description: 'Oversized condensed headlines meet saturated color.', style: { subtitle: false, layout: 'bleed', accentStyle: 'underline', bg: linear('#F97316', '#EC4899', 135), ink: '#FFFFFF', muted: '#FFF7ED', accent: '#FDE047', font: 'Anton', weight: 400, size: 150, tracking: 0 } },
  { id: 'color-block', name: 'Color Block', category: 'Bold', description: 'Graphic color fields and bold, clean contrast.', style: { subtitle: false, layout: 'flip', accentStyle: 'highlight', bg: solidBg('#4F46E5'), ink: '#FFFFFF', muted: '#E0E7FF', accent: '#A5F3FC', font: 'Archivo Black', weight: 400 } },
  { id: 'tilted', name: 'Tilted', category: 'Bold', description: 'A little perspective adds instant motion and depth.', style: { subtitle: false, layout: 'tilt', bg: mesh('#F8FAFC', ['#C7D2FE', '#FDA4AF', '#BAE6FD']), ink: '#111827', muted: '#4B5563', accent: '#4F46E5', font: 'Plus Jakarta Sans', weight: 800, device: { tiltY: -20, tiltX: 10 } } },
  { id: 'midnight', name: 'Midnight', category: 'Dark', description: 'Deep atmospheric color with polished titanium hardware.', style: { layout: 'bleed', accentStyle: 'gradient', bg: mesh('#080B18', ['#312E81', '#155E75', '#4338CA']), ink: '#F8FAFC', muted: '#CBD5E1', accent: '#67E8F9', device: { finish: 'black-titanium' } } },
  { id: 'neon', name: 'Neon', category: 'Dark', description: 'Electric accents glow against a cinematic dark canvas.', style: { subtitle: false, layout: 'classic', accentStyle: 'gradient', bg: mesh('#09090B', ['#701A75', '#312E81', '#BE185D']), ink: '#FAFAFA', muted: '#D4D4D8', accent: '#E879F9', font: 'Sora', weight: 700, device: { finish: 'black-titanium', glare: 0.18 } } },
  { id: 'premium', name: 'Premium', category: 'Dark', description: 'Navy, warm gold, and expressive serif typography.', style: { layout: 'classic', accentStyle: 'italic-serif', bg: mesh('#0C1424', ['#1E3A5F', '#7C5B32', '#172554']), ink: '#FFF9ED', muted: '#D6D3D1', accent: '#E9C982', font: 'DM Serif Display', weight: 400, eyebrow: '#E9C982', device: { finish: 'natural-titanium' } } },
  { id: 'sticker', name: 'Sticker', category: 'Playful', description: 'Joyful stickers and color pops bring the feature story to life.', style: { subtitle: false, layout: 'classic', accentStyle: 'highlight', bg: linear('#FEF3C7', '#FCE7F3'), ink: '#3B2442', muted: '#73566D', accent: '#EC4899', font: 'Fredoka', weight: 700, body: 'Nunito', bodyWeight: 600, extras: (i) => [createShape('star', { name: 'Sticker star', x: i % 2 ? 0.81 : 0.2, y: 0.48, w: 180, h: 180, fill: solid(i % 2 ? '#FBBF24' : '#FB7185'), rotation: 12 }), createText('badge', { name: 'New sticker', text: 'NEW', x: 0.79, y: 0.31, rotation: 10, fill: solid('#FFFFFF'), plate: { enabled: true, paint: solid('#EC4899'), radius: 999, padX: 22, padY: 12, stroke: { enabled: false, width: 0, color: '#FFFFFF', opacity: 0 } } })] } },
  { id: 'bubbly', name: 'Bubbly', category: 'Playful', description: 'Soft blobs and a tinted clay device make features feel friendly.', style: { layout: 'bleed', bg: mesh('#F0FDFA', ['#99F6E4', '#FBCFE8', '#BFDBFE']), ink: '#134E4A', muted: '#3F6B69', accent: '#0F766E', font: 'Quicksand', weight: 700, body: 'Quicksand', bodyWeight: 600, device: { style: 'clay', tint: '#BFE8E1' }, extras: () => [createShape('blob', { x: 0.12, y: 0.45, w: 300, h: 330, fill: solid('#F9A8D4'), rotation: 24 }), createShape('ellipse', { x: 0.88, y: 0.61, w: 210, h: 210, fill: solid('#A5B4FC') })] } },
  { id: 'duo', name: 'Duo', category: 'Playful', description: 'Two overlapping screens tell a richer product story.', style: { layout: 'duo', bg: linear('#EEF2FF', '#FCE7F3'), ink: '#1E1B4B', muted: '#5B5878', accent: '#7C3AED', font: 'Plus Jakarta Sans', weight: 800, device: { x: 0.36, y: 0.7, h: 0.72, rotation: -7 },
    // The second phone shows the next screenshot so it's never an empty placeholder.
    extras: (i, screens) => [createDevice({ name: 'Second device', x: 0.7, y: 0.73, h: 0.68, rotation: 7, style: 'real', finish: 'white-titanium', screen: { assetId: screens.length > 1 ? screens[(i + 1) % screens.length] ?? null : screens[i] ?? null, fit: 'cover', position: 'top', background: '#FFFFFF' }, shadow: { enabled: true, x: 0, y: 22, blur: 55, spread: 0, color: '#312E81', opacity: 0.2 } })] } },
  { id: 'magazine', name: 'Magazine', category: 'Editorial', description: 'Left aligned editorial typography with a graceful serif accent.', style: { layout: 'offset', accentStyle: 'italic-serif', bg: solidBg('#F5F1EA'), ink: '#24211D', muted: '#70685F', accent: '#A54A35', font: 'Instrument Serif', weight: 400, size: 124, align: 'left', titleW: 0.84, eyebrow: '#A54A35' } },
  { id: 'swiss', name: 'Swiss', category: 'Editorial', description: 'A measured grid, precise grotesk type, and disciplined spacing.', style: { layout: 'flip', bg: { kind: 'pattern', patternId: 'grid', base: '#F4F4F1', colors: ['#D4D4D0'], scale: 1, noise: 0.02 }, ink: '#18181B', muted: '#52525B', accent: '#DC2626', font: 'Inter Tight', weight: 750, align: 'left', titleY: 0.12, titleW: 0.84, eyebrow: '#DC2626', deviceAt: alternate({ y: 0.75 }, {}) } },
  { id: 'quote', name: 'Quote', category: 'Editorial', description: 'A testimonial led opening with proof and a composed device reveal.', style: { layout: 'classic', accentStyle: 'italic-serif', bg: linear('#FFF7ED', '#FDE2D5'), ink: '#292524', muted: '#78716C', accent: '#EA580C', font: 'Playfair Display', weight: 600, extras: (i) => [createText('caption', { name: 'Customer rating', text: i === 0 ? '★★★★★  4.9  •  Loved by 2M+' : '★★★★★  •  Made for everyday', y: 0.232, fontSize: 30, fill: solid('#B45309') })] } },
  { id: 'panorama-flow', name: 'Panorama Flow', category: 'Panorama', description: 'One continuous canvas with screens crossing every boundary.', style: { layout: 'panorama', bg: mesh('#F3F0FF', ['#C4B5FD', '#FBCFE8', '#A5F3FC']), ink: '#211A39', muted: '#5E5671', accent: '#6D28D9', font: 'Plus Jakarta Sans', weight: 800 } },
  { id: 'panorama-tilt', name: 'Panorama Tilt', category: 'Panorama', description: 'A kinetic gallery of tilted screens woven across the canvas.', style: { subtitle: false, layout: 'panorama', bg: mesh('#111827', ['#3730A3', '#0E7490', '#7E22CE']), ink: '#FFFFFF', muted: '#CBD5E1', accent: '#67E8F9', device: { tiltY: -16, tiltX: 6, rotation: 0, finish: 'black-titanium' } } },
  { id: 'gradient-ribbon', name: 'Gradient Ribbon', category: 'Panorama', description: 'A flowing ribbon of blurred color ties each frame together.', style: { subtitle: false, layout: 'panorama', bg: { kind: 'mesh', base: '#FFF7F0', points: [
    // A band of color weaving across the whole set, behind the phones.
    { x: 0.08, y: 0.42, color: '#FB7185', radius: 0.32 }, { x: 0.36, y: 0.56, color: '#A78BFA', radius: 0.34 }, { x: 0.64, y: 0.44, color: '#38BDF8', radius: 0.34 }, { x: 0.92, y: 0.58, color: '#F472B6', radius: 0.32 },
  ], noise: 0.1 }, ink: '#241B31', muted: '#64576C', accent: '#7C3AED', font: 'Plus Jakarta Sans', weight: 800 } },
];

function build(config: typeof configs[number], screens: Array<string | null>, copyItems: TemplateCopy[]) {
  const { style } = config;
  const layout: Layout = style.layout ?? 'classic';
  const spanning = layout === 'panorama';
  const light = (color: string) => {
    const [r, g, b] = [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6;
  };
  const gradientAccent = { kind: 'linear' as const, angle: 90, stops: [{ color: style.accent, position: 0 }, { color: light(style.ink) ? '#FFFFFF' : style.ink, position: 1 }] };
  const count = Math.max(1, copyItems.length);

  const assets: Asset[] = style.art
    ? [{ id: artAssetId(style.art.file), name: `${style.art.file}.webp`, src: `/templates/${style.art.file}.webp`, width: style.art.width, height: style.art.height }]
    : [];
  const artBackground: Background | null = style.art
    ? { kind: 'image', assetId: artAssetId(style.art.file), fit: 'cover', blur: 0, overlay: style.art.overlay ?? '#00000000', noise: 0.03 }
    : null;

  const slides = Array.from({ length: count }, (_, i): Slide => {
    const text = copyItems[i] ?? copy[i % copy.length];
    // Flip layouts put the text under the device on every other slide.
    const textBelow = layout === 'flip' && i % 2 === 1;
    const slideText = style.textAt?.(i) ?? {};
    const left = (slideText.align ?? style.align) === 'left' || layout === 'offset';
    const titleW = style.titleW ?? (left ? 0.84 : 0.86);
    const titleX = left ? 0.08 + titleW / 2 : 0.5;
    const eyebrowGap = style.eyebrow && !textBelow ? 0.03 : 0;
    const titleY = (textBelow ? 0.8 : style.titleY ?? (layout === 'bleed' ? 0.095 : 0.1)) + eyebrowGap;
    const subtitleY = textBelow ? titleY + 0.095 : (style.subtitleY ?? titleY + 0.092);

    const title = createText('title', {
      text: text.title, x: titleX, y: titleY, w: titleW,
      fontFamily: style.font ?? 'Inter', fontWeight: style.weight ?? 800, fontSize: style.size ?? 112,
      ...(style.tracking !== undefined ? { letterSpacing: style.tracking } : {}),
      align: left ? 'left' : 'center', fill: solid(style.ink),
      accent: { style: style.accentStyle ?? 'color', color: style.accent, paint: gradientAccent, // Text on a highlight must contrast with the highlight itself, not the page.
      textColor: light(style.accent) ? (light(style.ink) ? '#111827' : style.ink) : '#FFFFFF' },
    });
    const subtitle = createText('subtitle', {
      text: text.subtitle, x: left ? 0.08 + 0.4 : 0.5, y: subtitleY, w: 0.8,
      align: left ? 'left' : 'center', fontFamily: style.body ?? 'Inter', fontWeight: style.bodyWeight ?? 500, fontSize: style.bodySize ?? 48, fill: solid(style.muted),
    });
    // A device-only slide keeps its copy, just hidden, so switching templates later brings it back.
    if (slideText.hidden) title.visible = subtitle.visible = false;
    if (style.subtitle === false) subtitle.visible = false;
    const lift = style.subtitle === false && !textBelow && !slideText.hidden ? 0.045 : 0;
    const eyebrow = style.eyebrow
      ? [createText('caption', {
        name: 'Eyebrow', text: String(i + 1).padStart(2, '0'), x: left ? 0.08 + 0.15 : 0.5, y: titleY - 0.078, w: 0.3,
        align: left ? 'left' : 'center', fontFamily: style.body ?? 'Inter', fontWeight: 700, fontSize: 34, letterSpacing: 0.24, fill: solid(style.eyebrow),
      })]
      : [];

    const screen = { assetId: screens[i] ?? null, fit: 'cover' as const, position: 'top' as const, background: '#FFFFFF' };
    const shadow = { enabled: true, x: 0, y: 28, blur: 68, spread: 0, color: light(style.ink) ? '#000000' : style.ink, opacity: 0.22 };
    const placement: Partial<DeviceElement> = (() => {
      switch (layout) {
        case 'bleed': return { x: 0.5, y: 0.68, h: 0.86 };
        case 'flip': return textBelow ? { x: 0.5, y: 0.3, h: 0.82 } : { x: 0.5, y: 0.68, h: 0.8 };
        case 'offset': return { x: 0.6, y: 0.69, h: 0.78, rotation: 4 };
        // One consistent turn across the set reads as depth; mixing in a 2D rotation just looks skewed.
        case 'tilt': return { x: 0.5, y: 0.67, h: 0.72 };
        // Each phone sits right of center and runs into the next frame, so the set reads as one chain. Sized so a
        // phone crossing into the last frame still clears that frame's own phone by a visible gap, and kept
        // upright: even a small rotation swings the corners into the neighbour.
        case 'panorama': return { x: i < count - 1 ? 0.76 : 0.64, y: 0.67, h: 0.68 };
        default: return { x: 0.5, y: 0.645, h: 0.79 };
      }
    })();
    // An eyebrow pushes the headline down; move the device down with it so they never collide.
    if (eyebrowGap && placement.y !== undefined) placement.y += eyebrowGap;
    const device = createDevice({ ...placement, ...style.device, ...style.deviceAt?.(i), screen, shadow });
    device.y -= lift;
    const extras = style.extras?.(i, screens) ?? [];
    const elements: StudioElement[] = [...extras, device, ...eyebrow, title, subtitle];
    const background = style.bgs ? style.bgs[i % style.bgs.length] : spanning ? style.bg : artBackground ?? style.bg;
    return { id: makeId(), name: `${config.name} ${i + 1}`, background, elements, overrides: {} };
  });
  return { slides, span: { enabled: spanning, background: artBackground ?? style.bg }, assets };
}

export const TEMPLATES: Template[] = configs.map((config) => ({ ...config, defaultCopy: copy, build: (screens, copyItems) => build(config, screens, copyItems) }));
