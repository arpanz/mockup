/**
 * PresetSchema.ts
 *
 * Type definitions for per-app JSON preset files.
 * Each JSON file describes one app's full visual identity
 * and optionally overrides copy per slide index.
 *
 * Example usage:
 *   import presets from './presets/my-app.json';
 *   // then import via the UI button, or reference directly
 */

export type PresetSettings = {
  background?: string;
  titleColor?: string;
  accentColor?: string;
  subtitleColor?: string;
  layout?: 'text-top' | 'text-bottom' | 'centered';
  phonePositionMode?: 'centered' | 'half-down';
  textAlign?: 'left' | 'center' | 'right';
  deviceAlign?: 'left' | 'center' | 'right';
  deviceFrame?: boolean;
  imageFit?: 'cover' | 'contain';
  titleFontFamily?: string;
  subtitleFontFamily?: string;
  titleFontSize?: number;
  subtitleFontSize?: number;
  titleFontWeight?: number;
  subtitleFontWeight?: number;
  textSpacing?: number;
  deviceScale?: number;
  deviceBorder?: number;
  deviceRotation?: number;
  deviceTiltX?: number;
  deviceTiltY?: number;
  deviceShadow?: number;
};

/**
 * Per-slide copy override. If you define slides[], the app
 * will use each slide's title/subtitle when images are uploaded
 * in order. Extra slides fall back to the top-level defaults.
 */
export type PresetSlide = {
  /** 0-based slide index this entry maps to (optional, used for ordering) */
  index?: number;
  title: string;
  subtitle: string;
  /** Optional per-slide settings that override the preset's base settings */
  settingsOverrides?: PresetSettings;
};

/**
 * Top-level shape of a .json preset file.
 * Save one of these per app (e.g. fitness-app.json, finance-app.json)
 * then import it via the "Import Preset JSON" button in the UI.
 */
export type AppPresetFile = {
  /** Human-readable name shown in the preset dropdown */
  name: string;
  /**
   * Optional description shown as a tooltip.
   * Use this to remind yourself what campaign this is for.
   */
  description?: string;
  /** Default title for all slides (can be overridden per-slide) */
  defaultTitle: string;
  /** Default subtitle for all slides (can be overridden per-slide) */
  defaultSubtitle: string;
  /** Base visual settings for all slides */
  settings: PresetSettings;
  /**
   * Optional per-slide copy. If omitted, all slides use defaultTitle/defaultSubtitle.
   * Slides are applied in order when screenshots are uploaded.
   */
  slides?: PresetSlide[];
};
