/**
 * The contract between `npm run mockups` (scripts/mockups.ts, Node) and the headless studio page it drives
 * (agentPage.ts, browser). Node reads files and writes results; the page builds the project and renders it.
 */

/** mockups.json, as written by a person or an agent. Paths are relative to the spec file. */
export interface MockupSpec {
  /** Project name, used for the .frameflow file. Defaults to the spec folder's name. */
  name?: string;
  /** Template id from `npm run mockups -- --list`. Defaults to DEFAULT_TEMPLATE_ID. */
  template?: string;
  /** Store size ids from `--list`. Defaults to DEFAULT_SIZE_IDS. */
  sizes?: string[];
  /** Recolor the template to this hue, e.g. "#4F46E5". */
  brandColor?: string;
  /** Force subtitles on or off for the whole set. Omitted: the template decides. */
  subtitles?: boolean;
  /** Output folder. Defaults to "store-screenshots" next to the spec. */
  out?: string;
  format?: 'png' | 'jpeg';
  /** 1 = the store's exact pixel size (what stores want). 2 = double, for retina previews. */
  scale?: 1 | 2;
  screens: ScreenSpec[];
  /** Options for template "flow". Ignored by other templates. */
  flow?: FlowOptions;
}

export interface FlowOptions {
  /** light: paper page, dark type. night: ink page, white type everywhere. Default light. */
  theme?: 'light' | 'night';
  /** First and last slides are solid wave color (white type). Default true. */
  bookends?: boolean;
  /** Small rotations on bookend phones and alternating call-outs. Default false. */
  tilt?: boolean;
  /** Wave decorations. Default ["grid"]. */
  motifs?: Array<'grid' | 'corners'>;
  /** Color overrides; remaining colors derive from brandColor. */
  colors?: { page?: string; wave?: string; deep?: string; band?: string; accent?: string; ink?: string };
  /** Phone frame on every slide. Unset fields keep the house frame. */
  device?: FlowDevice;
  /**
   * classic (default): fixed places for headline and phone. snug: headline near the top, the phone right under it,
   * sized by `phoneWidth` and running off the bottom, so there's no dead space between them.
   */
  layout?: 'classic' | 'snug';
  /** snug only: phone width as a fraction of the slide width. Default 0.8. */
  phoneWidth?: number;
  /** Headline type for the whole set. Unset fields keep the house style. */
  type?: FlowType;
  /** framed (default): white border. lifted: no border, deeper shadow, so the piece reads as raised off the phone. */
  callouts?: 'framed' | 'lifted';
}

export interface FlowType {
  /** A family from the font catalog, e.g. "Bricolage Grotesque". */
  font?: string;
  weight?: number;
  /** Units; the house size is 112. */
  size?: number;
  /** Letter spacing in em, e.g. -0.03. */
  tracking?: number;
  lineHeight?: number;
  /** How starred words stand out. Default color. */
  accent?: 'color' | 'italic-serif' | 'highlight' | 'underline';
}

/** Device frame overrides for a flow set; same meaning as the studio's device settings. */
export interface FlowDevice {
  style?: 'real' | 'clay' | 'matte' | 'minimal' | 'glass' | 'outline' | 'none';
  /** Body color for clay, matte, minimal and outline. */
  tint?: string;
  /** Catalog finish for `real`, e.g. "natural-titanium". */
  finish?: string;
  /** Bezel thickness as a multiple of the model's own; 0 is edge to edge. */
  bezel?: number;
  /** Corner roundness as a multiple of the model's own. */
  corner?: number;
  material?: 'default' | 'gloss' | 'satin' | 'brushed' | 'frosted';
  cutout?: 'auto' | 'dynamic-island' | 'notch' | 'punch-hole' | 'none';
  /** Light rim around the outer edge, 0..1. */
  rim?: number;
  showButtons?: boolean;
  /** Screen reflection, 0..1. */
  glare?: number;
}

export interface ScreenSpec {
  /** Screenshot file (png, jpg or webp). */
  image: string;
  /** A different screenshot for one size, e.g. { "ipad-13": "ipad/home.png" }. Other sizes use `image`. */
  images?: Record<string, string>;
  /** Headline. `*word*` gets the template's accent, `\n` breaks the line. Empty or omitted hides it. */
  title?: string;
  /** Empty or omitted hides it. */
  subtitle?: string;
  /** Image above the headline, e.g. the app icon (png/jpg/webp/svg). */
  logo?: string;
  /** A Lucide icon name (kebab-case, e.g. "moon") shown under the headline. */
  icon?: string;
  /** Up to four tiles under the headline, each a Lucide icon and a one-word label. */
  tiles?: Array<{ icon: string; label: string }>;
  /** A piece of this screenshot floated over the phone, larger than the phone shows it. */
  callout?: FlowCallout;
  /** Any image placed on the slide. */
  sticker?: { image: string; x?: number; y?: number; width?: number; rotation?: number };
}

export interface FlowTile { icon: string; label: string }
export interface FlowCallout { crop: [number, number, number, number]; y?: number; width?: number; x?: number; rotation?: number }
export interface FlowSticker { image: AgentImage; x?: number; y?: number; width?: number; rotation?: number }

export const DEFAULT_TEMPLATE_ID = 'clean-center';
export const DEFAULT_SIZE_IDS = ['ios-69'];

/** A screenshot read from disk, as the page receives it. */
export interface AgentImage {
  /** File name, for messages. */
  name: string;
  /** data: URL */
  src: string;
}

export interface AgentBuildInput {
  name: string;
  templateId: string;
  sizeIds: string[];
  brandColor?: string;
  subtitles?: boolean;
  flow?: FlowOptions;
  screens: Array<{ image: AgentImage; images: Record<string, AgentImage>; title: string; subtitle: string; logo?: AgentImage; icon?: string; tiles?: FlowTile[]; callout?: FlowCallout; sticker?: FlowSticker }>;
}

export interface AgentBuildResult {
  slides: Array<{ name: string }>;
  outputs: Array<{ id: string; label: string; width: number; height: number }>;
  /** Things worth telling the person: hidden text, cropped screenshots, missing per-size images. */
  warnings: string[];
}

export interface AgentRenderOptions {
  format: 'png' | 'jpeg';
  scale: 1 | 2;
}

/** Installed on `window.frameflowAgent` by the page at `/#agent`. One project at a time; call `build` first. */
export interface FrameflowAgent {
  build(input: AgentBuildInput): Promise<AgentBuildResult>;
  /** The slide as base64 (no data: prefix), at the output's store size times `scale`. */
  render(slideIndex: number, outputId: string, options: AgentRenderOptions): Promise<string>;
  /** The built project as a .frameflow file, to open in the studio and fine-tune by hand. */
  projectFile(): string;
}
