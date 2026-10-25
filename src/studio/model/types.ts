/**
 * Frameflow Studio v2 — core document model.
 *
 * Geometry is resolution-independent so one design renders to every store size:
 * - `x`, `y` are the element CENTER as a fraction of the canvas width / height (0..1, may overflow
 *   past 0/1 to straddle neighbouring slides when the project spans).
 * - Text and free elements (image, shape) size in "units": 1u = baseUnit(W, H) px (see units.ts),
 *   so a 72u headline looks the same on an iPhone 6.9" and on an iPad 13".
 * - Devices size by height: `h` is the device height as a fraction of canvas height, so an iPad
 *   frame on an iPad canvas and a phone frame on a phone canvas both fill the same visual space.
 */

export type Id = string;

/* ───────────────────────── Outputs (store sizes) ───────────────────────── */

export type DeviceFamily = 'iphone' | 'ipad' | 'android-phone' | 'android-tablet' | 'mac' | 'web';

export interface OutputSpec {
  id: Id;
  label: string;          // "iPhone 6.9″"
  store: 'app-store' | 'play-store' | 'mac-app-store' | 'custom';
  family: DeviceFamily;   // decides which device model an `auto` device element renders
  width: number;          // export pixels
  height: number;
  required?: boolean;     // App Store requires this size
}

/* ───────────────────────── Paint & effects ───────────────────────── */

export interface GradientStop {
  color: string;          // #RRGGBB or #RRGGBBAA
  position: number;       // 0..1
}

export type Paint =
  | { kind: 'solid'; color: string }
  | { kind: 'linear'; angle: number; stops: GradientStop[] }
  | { kind: 'radial'; cx: number; cy: number; stops: GradientStop[] };

export interface Shadow {
  enabled: boolean;
  x: number;              // units
  y: number;              // units
  blur: number;           // units
  spread: number;         // units
  color: string;
  opacity: number;        // 0..1
}

export interface Stroke {
  enabled: boolean;
  width: number;          // units
  color: string;
  opacity: number;
}

/* ───────────────────────── Backgrounds ───────────────────────── */

export interface MeshPoint {
  x: number;              // 0..1
  y: number;              // 0..1
  color: string;
  radius: number;         // 0..1.5, fraction of the canvas diagonal
}

export type Background =
  | { kind: 'solid'; color: string; noise: number }
  | { kind: 'linear'; angle: number; stops: GradientStop[]; noise: number }
  | { kind: 'radial'; cx: number; cy: number; stops: GradientStop[]; noise: number }
  | { kind: 'mesh'; base: string; points: MeshPoint[]; noise: number }
  | {
      kind: 'pattern';
      patternId: string;  // see backgrounds/patterns
      base: string;
      colors: string[];   // pattern-specific palette
      scale: number;      // 0.5..2
      noise: number;
    }
  | {
      kind: 'image';
      assetId: Id;
      fit: 'cover' | 'contain';
      blur: number;       // units
      overlay: string;    // #RRGGBBAA tint drawn over the image
      noise: number;
    };

/* ───────────────────────── Elements ───────────────────────── */

export type ElementType = 'text' | 'device' | 'image' | 'shape';

export interface BaseElement {
  id: Id;
  type: ElementType;
  name: string;
  visible: boolean;
  locked: boolean;
  x: number;              // center, fraction of W
  y: number;              // center, fraction of H
  rotation: number;       // degrees
  opacity: number;        // 0..1
  shadow: Shadow;
}

export type TextAlign = 'left' | 'center' | 'right';

/**
 * Rich text uses a tiny markup: `*word*` renders with the accent style, `\n` breaks lines.
 */
export interface TextElement extends BaseElement {
  type: 'text';
  role: 'title' | 'subtitle' | 'caption' | 'badge';
  text: string;
  w: number;              // max line width, fraction of W
  fontFamily: string;     // a family from fonts/catalog
  fontWeight: number;     // 100..900
  fontSize: number;       // units
  lineHeight: number;     // multiplier
  letterSpacing: number;  // em
  align: TextAlign;
  transform: 'none' | 'uppercase';
  fill: Paint;
  accent: {
    style: 'color' | 'highlight' | 'underline' | 'gradient' | 'italic-serif';
    color: string;        // text color for `color`, marker color for `highlight`/`underline`
    paint: Paint;         // used by `gradient`
    textColor: string;    // text color on top of a highlight
  };
  stroke: Stroke;
  plate: {                // pill / badge behind the whole text block
    enabled: boolean;
    paint: Paint;
    radius: number;       // units
    padX: number;         // units
    padY: number;         // units
    stroke: Stroke;
  };
}

export type DeviceFrameStyle = 'real' | 'clay' | 'matte' | 'outline' | 'none';

export interface DeviceElement extends BaseElement {
  type: 'device';
  model: 'auto' | string; // 'auto' → catalog default for the output family; else a catalog model id
  h: number;              // device height, fraction of H
  style: DeviceFrameStyle;
  finish: string;         // catalog finish id for `real` (e.g. 'natural-titanium'); ignored otherwise
  tint: string;           // body color for clay / matte / outline
  orientation: 'portrait' | 'landscape';
  screen: {
    assetId: Id | null;   // null renders a polished placeholder screen
    fit: 'cover' | 'contain';
    position: 'top' | 'center' | 'bottom';
    background: string;   // shown behind `contain`
  };
  tiltX: number;          // 3D rotateX degrees, -45..45
  tiltY: number;          // 3D rotateY degrees, -45..45
  perspective: number;    // px at 1u scale, 600..4000
  showButtons: boolean;
  glare: number;          // 0..1 screen reflection
}

export interface ImageElement extends BaseElement {
  type: 'image';
  assetId: Id;
  w: number;              // units
  h: number;              // units
  fit: 'cover' | 'contain';
  radius: number;         // units
  stroke: Stroke;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shape: 'rect' | 'ellipse' | 'star' | 'blob';
  w: number;              // units
  h: number;              // units
  radius: number;         // units (rect)
  fill: Paint;
  stroke: Stroke;
  blur: number;           // units — soft glows / orbs
}

export type StudioElement = TextElement | DeviceElement | ImageElement | ShapeElement;

/* ───────────────────────── Document ───────────────────────── */

export interface Slide {
  id: Id;
  name: string;
  background: Background;           // ignored when project.span.enabled
  elements: StudioElement[];        // paint order: first = bottom
  /** Per-output tweaks: overrides[outputId][elementId] patches that element on that output only. */
  overrides: Record<Id, Record<Id, Partial<StudioElement>>>;
}

export interface Asset {
  id: Id;
  name: string;
  src: string;            // data URL
  width: number;
  height: number;
}

export interface Project {
  version: 2;
  id: Id;
  name: string;
  outputs: OutputSpec[];            // enabled store sizes; outputs[0] is the primary design size
  slides: Slide[];
  assets: Record<Id, Asset>;
  /** One continuous background behind all slides; elements may straddle slide edges. */
  span: { enabled: boolean; background: Background };
  updatedAt: number;
}

/* ───────────────────────── Editor-only state ───────────────────────── */

export type EditorMode = 'templates' | 'editor' | 'preview' | 'export';

export interface Selection {
  slideId: Id | null;
  elementIds: Id[];       // empty → the slide itself (background) is selected
  outputId: Id | null;    // which output row the user is working in (for overrides)
}
