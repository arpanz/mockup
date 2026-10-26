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
}

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
  screens: Array<{ image: AgentImage; images: Record<string, AgentImage>; title: string; subtitle: string }>;
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
