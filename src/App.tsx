import React, { useState, useRef, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import { toPng } from 'html-to-image';
import {
  Download,
  Image as ImageIcon,
  Type,
  Layout,
  Smartphone,
  Plus,
  Trash2,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Move,
  ZoomIn,
  ZoomOut,
  LocateFixed,
  Copy,
  Archive,
  FileDown,
  Layers,
  Upload,
  GripVertical,
  Check,
  Undo2,
  Redo2,
  Palette,
  MonitorSmartphone,
  Grid3X3,
  Settings2,
  Save,
  MousePointer2,
  Sparkles,
  X,
  Eye,
  EyeOff,
  LockKeyhole,
  LockKeyholeOpen,
  PanelLeft,
  PanelRight,
  Maximize2,
  Minimize2,
  Languages,
  Library,
  History,
  ShieldCheck,
} from 'lucide-react';
import type { AppPresetFile, PresetSlide } from './presets/PresetSchema';

type Point = { x: number; y: number };
type DeviceFrameStyle = 'midnight' | 'graphite' | 'silver' | 'gold' | 'minimal';
type ExportFormat = 'png' | 'jpeg' | 'webp';

type Settings = {
  canvasWidth: number;
  canvasHeight: number;
  background: string;
  backgroundPattern?: 'none' | 'emerald-wave' | string;
  backgroundPatternColor?: string;
  backgroundPatternCornerStart?: string;
  backgroundPatternCornerEnd?: string;
  backgroundPatternWaveColor?: string;
  backgroundGradientStart: string;
  backgroundGradientEnd: string;
  backgroundGradientAngle: number;
  titleColor: string;
  accentColor: string;
  subtitleColor: string;
  layout: 'text-top' | 'text-bottom' | 'centered';
  phonePositionMode: 'centered' | 'half-down' | 'half-up';
  textAlign: 'left' | 'center' | 'right';
  deviceAlign: 'left' | 'center' | 'right';
  deviceFrame: boolean;
  deviceFrameStyle: DeviceFrameStyle;
  deviceType: 'iphone' | 'android' | 'tablet' | 'laptop' | 'browser';
  deviceOrientation: 'portrait' | 'landscape';
  deviceFlipX: boolean;
  deviceFlipY: boolean;
  deviceFrameColor: string;
  deviceFrameEdgeColor: string;
  deviceCornerRadius: number;
  imageFit: 'cover' | 'contain';
  screenshotScale: number;
  screenshotOffsetX: number;
  screenshotOffsetY: number;
  screenshotRotation: number;
  screenshotBrightness: number;
  screenshotContrast: number;
  screenshotSaturation: number;
  titleFontFamily: string;
  subtitleFontFamily: string;
  titleFontSize: number;
  subtitleFontSize: number;
  titleFontWeight: number;
  subtitleFontWeight: number;
  titleLineHeight: number;
  subtitleLineHeight: number;
  titleLetterSpacing: number;
  subtitleLetterSpacing: number;
  textSpacing: number;
  deviceScale: number;
  deviceBorder: number;
  deviceRotation: number;
  deviceTiltX: number;
  deviceTiltY: number;
  deviceShadow: number;
};

type Screenshot = {
  id: string;
  url: string;
  title: string;
  subtitle: string;
  textOffset: Point;
  deviceOffset: Point;
  textVisible?: boolean;
  deviceVisible?: boolean;
  textLocked?: boolean;
  deviceLocked?: boolean;
  settingsOverrides?: Partial<Settings>;
  translations?: Record<string, { title: string; subtitle: string }>;
};

type EditorSnapshot = {
  settings: Settings;
  screenshots: Screenshot[];
  activeIndex: number;
};

type BrandKit = {
  name: string;
  primary: string;
  secondary: string;
  fontFamily: string;
};

type ProjectVersion = {
  id: string;
  name: string;
  createdAt: number;
  snapshot: EditorSnapshot;
};

type LocalProject = EditorSnapshot & {
  name: string;
  updatedAt: number;
  brandKit?: BrandKit;
  activeLocale?: string;
  versions?: ProjectVersion[];
};

type AppPreset = {
  id: string;
  name: string;
  title: string;
  subtitle: string;
  settings: Partial<Settings>;
  /** Optional per-slide copy from JSON. Indexed by slide number (0-based). */
  slides?: PresetSlide[];
};

type SectionKey = 'presets' | 'layout' | 'device' | 'typography';

const CANVAS_PRESETS = [
  { id: 'app-store-67', label: 'App Store 6.7″', width: 1290, height: 2796 },
  { id: 'app-store-65', label: 'App Store 6.5″', width: 1242, height: 2688 },
  { id: 'play-store', label: 'Google Play', width: 1080, height: 1920 },
  { id: 'social-portrait', label: 'Social portrait', width: 1080, height: 1350 },
  { id: 'square', label: 'Square', width: 1080, height: 1080 },
  { id: 'landscape', label: 'Web hero', width: 1600, height: 900 },
] as const;

const BACKGROUNDS = [
  '#d8d8dc',
  '#ffffff',
  '#f8fafc',
  '#0f172a',
  'linear-gradient(160deg, #057a44 0%, #046637 45%, #02381e 100%)',
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)',
  'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  'linear-gradient(135deg, #E8F9F2 0%, #F7FCFA 100%)',
];

const FONT_OPTIONS = [
  { label: 'Inter', value: "'Inter', sans-serif" },
  { label: 'Plus Jakarta Sans', value: "'Plus Jakarta Sans', sans-serif" },
  { label: 'Manrope', value: "'Manrope', sans-serif" },
  { label: 'Poppins', value: "'Poppins', sans-serif" },
  { label: 'Sora', value: "'Sora', sans-serif" },
  { label: 'Space Grotesk', value: "'Space Grotesk', sans-serif" },
  { label: 'DM Sans', value: "'DM Sans', sans-serif" },
  { label: 'Outfit', value: "'Outfit', sans-serif" },
];

const DEVICE_FRAMES: Array<{
  id: DeviceFrameStyle;
  name: string;
  shell: string;
  edge: string;
  island: string;
}> = [
    { id: 'midnight', name: 'Midnight', shell: '#09090B', edge: '#27272A', island: '#020203' },
    { id: 'graphite', name: 'Graphite', shell: '#303238', edge: '#71717A', island: '#111216' },
    { id: 'silver', name: 'Silver', shell: '#D7D9DD', edge: '#F4F4F5', island: '#151518' },
    { id: 'gold', name: 'Champagne', shell: '#C7AF86', edge: '#F1E4C9', island: '#17130E' },
    { id: 'minimal', name: 'Minimal', shell: '#FFFFFF', edge: '#E4E4E7', island: '#18181B' },
  ];

const DEVICE_POSES: Array<{ name: string; settings: Partial<Settings> }> = [
  { name: 'Straight', settings: { deviceRotation: 0, deviceTiltX: 0, deviceTiltY: 0, deviceShadow: 32 } },
  { name: 'Soft left', settings: { deviceRotation: -6, deviceTiltX: 2, deviceTiltY: -7, deviceShadow: 46 } },
  { name: 'Soft right', settings: { deviceRotation: 6, deviceTiltX: 2, deviceTiltY: 7, deviceShadow: 46 } },
  { name: 'Editorial', settings: { deviceRotation: -12, deviceTiltX: 5, deviceTiltY: -10, deviceShadow: 58 } },
];

const DEFAULT_SETTINGS: Settings = {
  canvasWidth: 1080,
  canvasHeight: 1920,
  background: 'linear-gradient(180deg, #F8FAFC 0%, #EEF2F7 100%)',
  backgroundPattern: 'none',
  backgroundPatternColor: '#009e52',
  backgroundPatternCornerStart: '#05c065',
  backgroundPatternCornerEnd: '#00783d',
  backgroundPatternWaveColor: '#008e49',
  backgroundGradientStart: '#F8FAFC',
  backgroundGradientEnd: '#EEF2F7',
  backgroundGradientAngle: 180,
  titleColor: '#0F172A',
  accentColor: '#2563EB',
  subtitleColor: '#334155',
  layout: 'text-top',
  phonePositionMode: 'centered',
  textAlign: 'center',
  deviceAlign: 'center',
  deviceFrame: true,
  deviceFrameStyle: 'midnight',
  deviceType: 'iphone',
  deviceOrientation: 'portrait',
  deviceFlipX: false,
  deviceFlipY: false,
  deviceFrameColor: '#09090B',
  deviceFrameEdgeColor: '#27272A',
  deviceCornerRadius: 58,
  imageFit: 'cover',
  screenshotScale: 100,
  screenshotOffsetX: 0,
  screenshotOffsetY: 0,
  screenshotRotation: 0,
  screenshotBrightness: 100,
  screenshotContrast: 100,
  screenshotSaturation: 100,
  titleFontFamily: "'Inter', sans-serif",
  subtitleFontFamily: "'Inter', sans-serif",
  titleFontSize: 96,
  subtitleFontSize: 43,
  titleFontWeight: 700,
  subtitleFontWeight: 500,
  titleLineHeight: 1.08,
  subtitleLineHeight: 1.4,
  titleLetterSpacing: -1,
  subtitleLetterSpacing: 0,
  textSpacing: 26,
  deviceScale: 80,
  deviceBorder: 10,
  deviceRotation: 0,
  deviceTiltX: 0,
  deviceTiltY: 0,
  deviceShadow: 36,
};

const DEFAULT_PRESETS: AppPreset[] = [
  {
    id: 'preset-minimal-light',
    name: 'Minimal Light',
    title: 'Showcase your [accent]app[/accent] beautifully',
    subtitle: 'Fast • Clean • Product-ready visuals',
    settings: {
      ...DEFAULT_SETTINGS,
      background: 'linear-gradient(180deg, #F8FAFC 0%, #EEF2F7 100%)',
      titleColor: '#0F172A',
      subtitleColor: '#334155',
      accentColor: '#2563EB',
      deviceRotation: 0,
      deviceTiltX: 0,
      deviceTiltY: 0,
      deviceShadow: 42,
    },
  },
  {
    id: 'preset-dark-bold',
    name: 'Dark Bold',
    title: 'Designed for [accent]premium[/accent] launches',
    subtitle: 'High contrast • Bold typography • Store-ready',
    settings: {
      ...DEFAULT_SETTINGS,
      background: '#0F172A',
      titleColor: '#FFFFFF',
      subtitleColor: '#CBD5E1',
      accentColor: '#60A5FA',
      titleFontFamily: "'Space Grotesk', sans-serif",
      subtitleFontFamily: "'Inter', sans-serif",
      deviceRotation: 0,
      deviceTiltX: 0,
      deviceTiltY: 0,
      deviceShadow: 48,
    },
  },
  {
    id: 'preset-gradient-launch',
    name: 'Gradient Launch',
    title: 'Make every screen feel [accent]alive[/accent]',
    subtitle: 'Color-rich campaigns for modern apps',
    settings: {
      ...DEFAULT_SETTINGS,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      titleColor: '#FFFFFF',
      subtitleColor: '#E9D5FF',
      accentColor: '#FDE68A',
      titleFontFamily: "'Outfit', sans-serif",
      subtitleFontFamily: "'DM Sans', sans-serif",
      deviceRotation: 0,
      deviceTiltX: 0,
      deviceTiltY: 0,
      deviceShadow: 56,
    },
  },
  {
    id: 'preset-emerald-flow',
    name: 'Emerald Flow',
    title: 'Heavy data? [accent]No sweat.[/accent]',
    subtitle: 'Opens 1 million+ row files smoothly.',
    settings: {
      ...DEFAULT_SETTINGS,
      background: 'linear-gradient(160deg, #00a455 0%, #00984f 45%, #008746 100%)',
      backgroundPattern: 'emerald-wave',
      backgroundPatternColor: '#009e52',
      backgroundPatternCornerStart: '#05c065',
      backgroundPatternCornerEnd: '#00783d',
      backgroundPatternWaveColor: '#008e49',
      titleColor: '#FFFFFF',
      subtitleColor: '#E6FBF0',
      accentColor: '#6EE7B7',
      titleFontFamily: "'Plus Jakarta Sans', sans-serif",
      subtitleFontFamily: "'Inter', sans-serif",
      deviceFrameStyle: 'midnight',
      deviceType: 'android',
      deviceRotation: 0,
      deviceTiltX: 0,
      deviceTiltY: 0,
      deviceShadow: 52,
    },
  },
  {
    id: 'preset-cyber-grid',
    name: 'Cyber Horizon',
    title: 'Next-gen [accent]trading[/accent] engine',
    subtitle: 'Built for precision, sub-millisecond execution.',
    settings: {
      ...DEFAULT_SETTINGS,
      background: 'linear-gradient(160deg, #0a101f 0%, #082f49 45%, #020617 100%)',
      backgroundPattern: 'cyber-grid',
      backgroundPatternColor: '#0a101f',
      backgroundPatternCornerStart: '#06b6d4',
      backgroundPatternCornerEnd: '#082f49',
      backgroundPatternWaveColor: '#38bdf8',
      titleColor: '#FFFFFF',
      subtitleColor: '#BAE6FD',
      accentColor: '#38BDF8',
      titleFontFamily: "'Space Grotesk', sans-serif",
      subtitleFontFamily: "'Inter', sans-serif",
      deviceFrameStyle: 'midnight',
      deviceType: 'iphone',
      deviceRotation: 0,
      deviceTiltX: 0,
      deviceTiltY: 0,
      deviceShadow: 56,
    },
  },
  {
    id: 'preset-aurora-glow',
    name: 'Aurora Mesh',
    title: 'Experience [accent]pure clarity[/accent]',
    subtitle: 'Fluid intelligence designed around you.',
    settings: {
      ...DEFAULT_SETTINGS,
      background: 'linear-gradient(160deg, #1a072d 0%, #3b0764 45%, #0f021f 100%)',
      backgroundPattern: 'aurora-mesh',
      backgroundPatternColor: '#1a072d',
      backgroundPatternCornerStart: '#ec4899',
      backgroundPatternCornerEnd: '#3b0764',
      backgroundPatternWaveColor: '#c084fc',
      titleColor: '#FFFFFF',
      subtitleColor: '#F5D0FE',
      accentColor: '#F472B6',
      titleFontFamily: "'Outfit', sans-serif",
      subtitleFontFamily: "'Inter', sans-serif",
      deviceFrameStyle: 'silver',
      deviceType: 'iphone',
      deviceRotation: 0,
      deviceTiltX: 0,
      deviceTiltY: 0,
      deviceShadow: 54,
    },
  },
  {
    id: 'preset-glass-orbs',
    name: 'Glass Spheres',
    title: 'Smart [accent]wealth[/accent] management',
    subtitle: 'Track assets, portfolios, and yields in one place.',
    settings: {
      ...DEFAULT_SETTINGS,
      background: 'linear-gradient(160deg, #121212 0%, #292524 45%, #09090b 100%)',
      backgroundPattern: 'glass-spheres',
      backgroundPatternColor: '#121212',
      backgroundPatternCornerStart: '#eab308',
      backgroundPatternCornerEnd: '#292524',
      backgroundPatternWaveColor: '#fde047',
      titleColor: '#FFFFFF',
      subtitleColor: '#FEF08A',
      accentColor: '#FACC15',
      titleFontFamily: "'Plus Jakarta Sans', sans-serif",
      subtitleFontFamily: "'Inter', sans-serif",
      deviceFrameStyle: 'gold',
      deviceType: 'iphone',
      deviceRotation: 0,
      deviceTiltX: 0,
      deviceTiltY: 0,
      deviceShadow: 50,
    },
  },
];

const PRESET_STORAGE_KEY = 'mockup-app-presets-v1';
const PRESET_SELECTION_KEY = 'mockup-selected-preset-v1';
const PROJECT_DB_NAME = 'frameflow-projects-v1';
const PROJECT_STORE_NAME = 'projects';
const ACTIVE_PROJECT_ID = 'active-project';
const PRESET_TRANSFORM_MIGRATION_KEY = 'mockup-zero-transform-defaults-v1';
const BUILT_IN_PRESET_IDS = new Set(DEFAULT_PRESETS.map((preset) => preset.id));
const ZERO_DEVICE_TRANSFORMS = {
  deviceRotation: 0,
  deviceTiltX: 0,
  deviceTiltY: 0,
} satisfies Partial<Settings>;

const makeId = () => Math.random().toString(36).slice(2, 11);

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error ?? new Error('Unable to read file'));
  reader.readAsDataURL(file);
});

const convertImageDataUrl = (
  dataUrl: string,
  format: Exclude<ExportFormat, 'png'>,
  quality: number
) => new Promise<string>((resolve, reject) => {
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      reject(new Error('Unable to create export canvas'));
      return;
    }
    if (format === 'jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(image, 0, 0);
    resolve(canvas.toDataURL(`image/${format}`, quality));
  };
  image.onerror = () => reject(new Error('Unable to convert export image'));
  image.src = dataUrl;
});

const sanitizeFilename = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9._-]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '') || 'frameflow-export';

const openProjectDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = window.indexedDB.open(PROJECT_DB_NAME, 1);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(PROJECT_STORE_NAME)) {
      database.createObjectStore(PROJECT_STORE_NAME);
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('Unable to open local project storage'));
});

const saveLocalProject = async (project: LocalProject) => {
  const database = await openProjectDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(PROJECT_STORE_NAME, 'readwrite');
    transaction.objectStore(PROJECT_STORE_NAME).put(project, ACTIVE_PROJECT_ID);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to save project'));
  });
  database.close();
};

const loadLocalProject = async () => {
  const database = await openProjectDatabase();
  const project = await new Promise<LocalProject | undefined>((resolve, reject) => {
    const transaction = database.transaction(PROJECT_STORE_NAME, 'readonly');
    const request = transaction.objectStore(PROJECT_STORE_NAME).get(ACTIVE_PROJECT_ID);
    request.onsuccess = () => resolve(request.result as LocalProject | undefined);
    request.onerror = () => reject(request.error ?? new Error('Unable to load project'));
  });
  database.close();
  return project;
};

const createDemoScreen = (variant: number) => {
  const palettes = [
    { background: '#F8FAFC', card: '#FFFFFF', accent: '#4F46E5', soft: '#E0E7FF', title: 'Overview' },
    { background: '#0F172A', card: '#1E293B', accent: '#38BDF8', soft: '#164E63', title: 'Insights' },
    { background: '#FFF7ED', card: '#FFFFFF', accent: '#F97316', soft: '#FFEDD5', title: 'Activity' },
  ];
  const palette = palettes[variant % palettes.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="430" height="932" viewBox="0 0 430 932">
    <rect width="430" height="932" fill="${palette.background}"/>
    <text x="28" y="62" fill="${palette.title === 'Insights' ? '#F8FAFC' : '#0F172A'}" font-family="Inter,Arial" font-size="26" font-weight="700">${palette.title}</text>
    <circle cx="382" cy="48" r="20" fill="${palette.soft}"/>
    <rect x="24" y="94" width="382" height="168" rx="26" fill="${palette.accent}"/>
    <text x="48" y="135" fill="white" opacity=".78" font-family="Inter,Arial" font-size="13" font-weight="600">THIS MONTH</text>
    <text x="48" y="194" fill="white" font-family="Inter,Arial" font-size="44" font-weight="750">$24,890</text>
    <path d="M48 230 C92 190 124 238 164 202 S238 184 276 212 S338 164 382 177" fill="none" stroke="white" stroke-width="5" stroke-linecap="round" opacity=".75"/>
    <text x="28" y="314" fill="${palette.title === 'Insights' ? '#CBD5E1' : '#334155'}" font-family="Inter,Arial" font-size="17" font-weight="700">Your workspace</text>
    <rect x="24" y="340" width="180" height="154" rx="22" fill="${palette.card}"/>
    <rect x="226" y="340" width="180" height="154" rx="22" fill="${palette.card}"/>
    <circle cx="62" cy="380" r="18" fill="${palette.soft}"/><rect x="48" y="421" width="112" height="12" rx="6" fill="${palette.soft}"/><rect x="48" y="447" width="76" height="10" rx="5" fill="${palette.accent}" opacity=".55"/>
    <circle cx="264" cy="380" r="18" fill="${palette.soft}"/><rect x="250" y="421" width="112" height="12" rx="6" fill="${palette.soft}"/><rect x="250" y="447" width="88" height="10" rx="5" fill="${palette.accent}" opacity=".55"/>
    <rect x="24" y="520" width="382" height="244" rx="26" fill="${palette.card}"/>
    <text x="48" y="562" fill="${palette.title === 'Insights' ? '#F8FAFC' : '#334155'}" font-family="Inter,Arial" font-size="16" font-weight="700">Recent performance</text>
    <rect x="48" y="600" width="334" height="12" rx="6" fill="${palette.soft}"/><rect x="48" y="600" width="252" height="12" rx="6" fill="${palette.accent}"/>
    <rect x="48" y="642" width="334" height="12" rx="6" fill="${palette.soft}"/><rect x="48" y="642" width="196" height="12" rx="6" fill="${palette.accent}" opacity=".75"/>
    <rect x="48" y="684" width="334" height="12" rx="6" fill="${palette.soft}"/><rect x="48" y="684" width="292" height="12" rx="6" fill="${palette.accent}" opacity=".55"/>
    <rect x="24" y="804" width="382" height="82" rx="24" fill="${palette.card}"/>
    <circle cx="76" cy="845" r="14" fill="${palette.accent}"/><circle cx="170" cy="845" r="10" fill="${palette.soft}"/><circle cx="264" cy="845" r="10" fill="${palette.soft}"/><circle cx="358" cy="845" r="10" fill="${palette.soft}"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const cloneEditorSnapshot = (
  settings: Settings,
  screenshots: Screenshot[],
  activeIndex: number
): EditorSnapshot => ({
  settings: { ...settings },
  screenshots: screenshots.map((slide) => ({
    ...slide,
    textOffset: { ...slide.textOffset },
    deviceOffset: { ...slide.deviceOffset },
    settingsOverrides: slide.settingsOverrides ? { ...slide.settingsOverrides } : undefined,
    translations: slide.translations
      ? Object.fromEntries(Object.entries(slide.translations).map(([locale, copy]) => [locale, { ...copy }]))
      : undefined,
  })),
  activeIndex,
});

const snapshotsMatch = (a: EditorSnapshot, b: EditorSnapshot) =>
  JSON.stringify({ settings: a.settings, screenshots: a.screenshots }) ===
  JSON.stringify({ settings: b.settings, screenshots: b.screenshots });

/** Convert a parsed AppPresetFile JSON into an AppPreset usable by the app */
function jsonFileToPreset(file: AppPresetFile): AppPreset {
  return {
    id: makeId(),
    name: file.name,
    title: file.defaultTitle,
    subtitle: file.defaultSubtitle,
    settings: file.settings as Partial<Settings>,
    slides: file.slides,
  };
}

/** Basic validation so a bad JSON shows a clear error instead of silent failure */
function validatePresetFile(obj: unknown): obj is AppPresetFile {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.name === 'string' &&
    typeof o.defaultTitle === 'string' &&
    typeof o.defaultSubtitle === 'string' &&
    typeof o.settings === 'object'
  );
}

const PanelSection = ({
  id,
  title,
  description,
  open,
  onToggle,
  children,
}: {
  id?: string;
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <section
    id={id}
    className={`scroll-mt-4 overflow-hidden rounded-2xl border bg-white transition-all ${open
      ? 'border-slate-200 shadow-[0_8px_30px_rgba(15,23,42,0.06)]'
      : 'border-slate-200/80 shadow-sm'
      }`}
  >
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-start justify-between px-4 py-4 text-left transition-colors hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
    >
      <div>
        <h3 className="text-sm font-bold tracking-tight text-slate-900">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
      </div>
      <ChevronRight size={18} className={`mt-0.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} />
    </button>
    {open && <div className="space-y-5 border-t border-slate-100 px-4 pb-5 pt-4">{children}</div>}
  </section>
);

const DESIGNER_PATTERN_PRESETS = [
  {
    id: 'emerald-flow',
    name: 'Emerald Flow',
    base: '#009e52',
    cornerStart: '#05c065',
    cornerEnd: '#00783d',
    wave: '#008e49',
    badge: 'Play Store',
  },
  {
    id: 'cyber-cyan',
    name: 'Cyber Cyan',
    base: '#0a101f',
    cornerStart: '#06b6d4',
    cornerEnd: '#082f49',
    wave: '#38bdf8',
    badge: 'SaaS / Pro',
  },
  {
    id: 'royal-magenta',
    name: 'Royal Magenta',
    base: '#1a072d',
    cornerStart: '#ec4899',
    cornerEnd: '#3b0764',
    wave: '#c084fc',
    badge: 'AI / Creative',
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Gold',
    base: '#1c0e1e',
    cornerStart: '#f59e0b',
    cornerEnd: '#451a03',
    wave: '#fb923c',
    badge: 'Warm / Finance',
  },
  {
    id: 'crimson-ruby',
    name: 'Crimson Rose',
    base: '#1f0910',
    cornerStart: '#f43f5e',
    cornerEnd: '#4c0519',
    wave: '#fb7185',
    badge: 'Fitness',
  },
  {
    id: 'electric-lime',
    name: 'Acid Lime',
    base: '#0b1610',
    cornerStart: '#84cc16',
    cornerEnd: '#14532d',
    wave: '#4ade80',
    badge: 'Gaming',
  },
  {
    id: 'ocean-teal',
    name: 'Ocean Teal',
    base: '#041f22',
    cornerStart: '#14b8a6',
    cornerEnd: '#042f2e',
    wave: '#2dd4bf',
    badge: 'Health',
  },
  {
    id: 'obsidian-gold',
    name: 'Obsidian Gold',
    base: '#121212',
    cornerStart: '#eab308',
    cornerEnd: '#292524',
    wave: '#fde047',
    badge: 'Dark Luxury',
  },
];

function hexToHsl(hexColor: string) {
  const clean = hexColor.replace(/[^0-9a-fA-F]/g, '');
  const hex = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean.padEnd(6, '0').slice(0, 6);

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToHex(hue: number, sat: number, lit: number) {
  lit = Math.max(0, Math.min(100, lit)) / 100;
  sat = Math.max(0, Math.min(100, sat));
  const a = (sat * Math.min(lit, 1 - lit)) / 100;
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    const color = lit - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function computePatternTones(
  baseColor: string = '#009e52',
  cornerStart?: string,
  cornerEnd?: string,
  waveColor?: string
) {
  const baseHsl = hexToHsl(baseColor);

  const cStartHsl = cornerStart
    ? hexToHsl(cornerStart)
    : { h: baseHsl.h, s: baseHsl.s, l: Math.min(56, baseHsl.l + 6) };

  const cEndHsl = cornerEnd
    ? hexToHsl(cornerEnd)
    : { h: baseHsl.h, s: baseHsl.s, l: Math.max(20, baseHsl.l - 8) };

  const waveHsl = waveColor
    ? hexToHsl(waveColor)
    : { h: baseHsl.h, s: baseHsl.s, l: Math.max(22, baseHsl.l - 4) };

  // 1. Base backdrop tones — smooth, luminous, low-contrast gradient
  const baseGrad0 = hslToHex(baseHsl.h, baseHsl.s, Math.min(54, baseHsl.l + 3));
  const baseGrad30 = hslToHex(baseHsl.h, baseHsl.s, Math.min(50, baseHsl.l + 1));
  const baseGrad65 = hslToHex(baseHsl.h, baseHsl.s, Math.max(24, baseHsl.l - 2));
  const baseGrad100 = hslToHex(baseHsl.h, baseHsl.s, Math.max(20, baseHsl.l - 5));
  const glowCenter = hslToHex(baseHsl.h, Math.min(100, baseHsl.s + 8), Math.min(62, baseHsl.l + 8));
  const glowWave = hslToHex(waveHsl.h, Math.min(100, waveHsl.s + 8), Math.min(62, waveHsl.l + 8));

  // 2. Corner ribbon gradient stops (clean, light emerald facets)
  const ribbonTop0 = hslToHex(cStartHsl.h, cStartHsl.s, Math.min(58, cStartHsl.l + 3));
  const ribbonTop60 = hslToHex(cStartHsl.h, cStartHsl.s, cStartHsl.l);
  const ribbonTop100 = hslToHex(cEndHsl.h, cEndHsl.s, Math.max(23, cEndHsl.l + 3));

  const ribbonMid0 = hslToHex(cStartHsl.h, cStartHsl.s, Math.min(54, cStartHsl.l + 1));
  const ribbonMid50 = hslToHex(
    Math.round((cStartHsl.h + cEndHsl.h) / 2),
    Math.round((cStartHsl.s + cEndHsl.s) / 2),
    Math.max(25, Math.round((cStartHsl.l + cEndHsl.l) / 2))
  );
  const ribbonMid100 = hslToHex(cEndHsl.h, cEndHsl.s, Math.max(22, cEndHsl.l + 1));

  const ribbonLow0 = hslToHex(cStartHsl.h, cStartHsl.s, Math.max(24, cStartHsl.l - 3));
  const ribbonLow70 = hslToHex(cEndHsl.h, cEndHsl.s, Math.max(22, cEndHsl.l + 2));
  const ribbonLow100 = hslToHex(cEndHsl.h, cEndHsl.s, Math.max(19, cEndHsl.l - 2));

  const ribbonBottom0 = hslToHex(cStartHsl.h, cStartHsl.s, Math.max(22, cStartHsl.l - 5));
  const ribbonBottom100 = hslToHex(cEndHsl.h, cEndHsl.s, Math.max(17, cEndHsl.l - 5));

  // 3. 3D Wave body & highlight
  const waveBody0 = hslToHex(waveHsl.h, waveHsl.s, Math.min(50, waveHsl.l + 3));
  const waveBody35 = hslToHex(waveHsl.h, waveHsl.s, waveHsl.l);
  const waveBody75 = hslToHex(waveHsl.h, waveHsl.s, Math.max(22, waveHsl.l - 3));
  const waveBody100 = hslToHex(waveHsl.h, waveHsl.s, Math.max(18, waveHsl.l - 6));
  const waveHighlight0 = hslToHex(waveHsl.h, Math.min(100, waveHsl.s + 10), Math.min(76, waveHsl.l + 18));
  const waveHighlight50 = hslToHex(waveHsl.h, Math.min(100, waveHsl.s + 5), Math.min(68, waveHsl.l + 12));
  const waveUnderside = hslToHex(waveHsl.h, waveHsl.s, Math.max(14, waveHsl.l - 8));
  const cornerBalance = hslToHex(cEndHsl.h, cEndHsl.s, Math.max(16, cEndHsl.l - 6));

  const lineStroke1 = hslToHex(cStartHsl.h, Math.min(100, cStartHsl.s + 10), Math.min(78, cStartHsl.l + 18));
  const lineStroke2 = hslToHex(cStartHsl.h, Math.min(100, cStartHsl.s + 15), Math.min(84, cStartHsl.l + 22));

  return {
    baseGrad0,
    baseGrad30,
    baseGrad65,
    baseGrad100,
    glowCenter,
    glowWave,
    ribbonTop0,
    ribbonTop60,
    ribbonTop100,
    ribbonMid0,
    ribbonMid50,
    ribbonMid100,
    ribbonLow0,
    ribbonLow70,
    ribbonLow100,
    ribbonBottom0,
    ribbonBottom100,
    waveBody0,
    waveBody35,
    waveBody75,
    waveBody100,
    waveHighlight0,
    waveHighlight50,
    waveUnderside,
    cornerBalance,
    lineStroke1,
    lineStroke2,
    titleColor: '#FFFFFF',
    subtitleColor: hslToHex(cStartHsl.h, Math.min(60, cStartHsl.s), 94),
    accentColor: hslToHex(cStartHsl.h, Math.min(100, cStartHsl.s + 20), 72),
  };
}

type PatternProps = {
  idPrefix?: string;
  baseColor?: string;
  cornerStart?: string;
  cornerEnd?: string;
  waveColor?: string;
};

const EmeraldWaveBackground = ({
  idPrefix = 'ew',
  baseColor = '#009e52',
  cornerStart,
  cornerEnd,
  waveColor,
}: PatternProps) => {
  const uid = React.useId().replace(/[:]/g, '');
  const prefix = `${idPrefix}-${uid}`;
  const tones = computePatternTones(baseColor, cornerStart, cornerEnd, waveColor);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1080 1920"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 pointer-events-none select-none"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient id={`${prefix}-base-grad`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor={tones.baseGrad0} />
          <stop offset="35%" stopColor={tones.baseGrad30} />
          <stop offset="70%" stopColor={tones.baseGrad65} />
          <stop offset="100%" stopColor={tones.baseGrad100} />
        </linearGradient>

        <radialGradient id={`${prefix}-glow`} cx="50%" cy="26%" r="55%">
          <stop offset="0%" stopColor={tones.glowCenter} stopOpacity="0.08" />
          <stop offset="60%" stopColor={tones.baseGrad30} stopOpacity="0.02" />
          <stop offset="100%" stopColor={tones.baseGrad65} stopOpacity="0" />
        </radialGradient>

        <radialGradient id={`${prefix}-wave-glow`} cx="85%" cy="56%" r="38%">
          <stop offset="0%" stopColor={tones.glowWave} stopOpacity="0.08" />
          <stop offset="60%" stopColor={tones.baseGrad65} stopOpacity="0.02" />
          <stop offset="100%" stopColor={tones.baseGrad100} stopOpacity="0" />
        </radialGradient>

        <filter id={`${prefix}-shadow-1`} x="-20%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="8" dy="16" stdDeviation="16" floodColor="#000000" floodOpacity="0.22" />
        </filter>
        <filter id={`${prefix}-shadow-2`} x="-20%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="6" dy="12" stdDeviation="14" floodColor="#000000" floodOpacity="0.18" />
        </filter>
        <filter id={`${prefix}-shadow-3`} x="-20%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="4" dy="10" stdDeviation="12" floodColor="#000000" floodOpacity="0.14" />
        </filter>
        <filter id={`${prefix}-wave-shadow`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="-4" dy="18" stdDeviation="22" floodColor="#000000" floodOpacity="0.22" />
        </filter>

        <linearGradient id={`${prefix}-ribbon-grad-top`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={tones.ribbonTop0} />
          <stop offset="60%" stopColor={tones.ribbonTop60} />
          <stop offset="100%" stopColor={tones.ribbonTop100} />
        </linearGradient>

        <linearGradient id={`${prefix}-ribbon-grad-mid`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={tones.ribbonMid0} />
          <stop offset="50%" stopColor={tones.ribbonMid50} />
          <stop offset="100%" stopColor={tones.ribbonMid100} />
        </linearGradient>

        <linearGradient id={`${prefix}-ribbon-grad-low`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={tones.ribbonLow0} />
          <stop offset="70%" stopColor={tones.ribbonLow70} />
          <stop offset="100%" stopColor={tones.ribbonLow100} />
        </linearGradient>

        <linearGradient id={`${prefix}-ribbon-grad-bottom`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={tones.ribbonBottom0} />
          <stop offset="100%" stopColor={tones.ribbonBottom100} />
        </linearGradient>

        <linearGradient id={`${prefix}-wave-grad-body`} x1="0.1" y1="0.2" x2="0.9" y2="0.8">
          <stop offset="0%" stopColor={tones.waveBody0} />
          <stop offset="35%" stopColor={tones.waveBody35} />
          <stop offset="75%" stopColor={tones.waveBody75} />
          <stop offset="100%" stopColor={tones.waveBody100} />
        </linearGradient>

        <linearGradient id={`${prefix}-wave-top-highlight`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={tones.waveHighlight0} stopOpacity="0.45" />
          <stop offset="45%" stopColor={tones.waveHighlight50} stopOpacity="0.3" />
          <stop offset="100%" stopColor={tones.glowCenter} stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* 1. Deep Base Layer */}
      <rect width="1080" height="1920" fill={`url(#${prefix}-base-grad)`} />

      {/* 2. Ambient Lighting Overlays */}
      <rect width="1080" height="1920" fill={`url(#${prefix}-glow)`} />
      <rect width="1080" height="1920" fill={`url(#${prefix}-wave-glow)`} />

      {/* 3. Left Diagonal Ribbons */}
      <g id={`${prefix}-left-ribbons`}>
        <polygon
          points="-60,1440 260,1720 160,1960 -60,1780"
          fill={`url(#${prefix}-ribbon-grad-bottom)`}
          filter={`url(#${prefix}-shadow-3)`}
        />
        <polygon
          points="-60,1040 320,1380 200,1640 -60,1360"
          fill={`url(#${prefix}-ribbon-grad-low)`}
          filter={`url(#${prefix}-shadow-2)`}
        />
        <polygon
          points="-60,340 310,680 180,920 -60,620"
          fill={`url(#${prefix}-ribbon-grad-top)`}
          filter={`url(#${prefix}-shadow-1)`}
        />
        <polygon
          points="-60,620 400,1020 250,1320 -60,960"
          fill={`url(#${prefix}-ribbon-grad-mid)`}
          filter={`url(#${prefix}-shadow-1)`}
        />

        <line x1="-60" y1="620" x2="400" y2="1020" stroke={tones.lineStroke1} strokeWidth="2.5" strokeOpacity="0.32" />
        <line x1="-60" y1="340" x2="310" y2="680" stroke={tones.lineStroke2} strokeWidth="2" strokeOpacity="0.28" />
        <line x1="-60" y1="1040" x2="320" y2="1380" stroke={tones.lineStroke1} strokeWidth="1.5" strokeOpacity="0.2" />
      </g>

      {/* 4. Right 3D Sweeping Wave Ribbon */}
      <g id={`${prefix}-right-wave`} filter={`url(#${prefix}-wave-shadow)`}>
        <path
          d="M 460,920
             C 640,940 780,1060 860,1160
             C 940,1260 1000,1290 1140,1260
             L 1140,1430
             C 970,1470 880,1400 790,1300
             C 700,1200 560,1100 460,1080
             Z"
          fill={`url(#${prefix}-wave-grad-body)`}
        />
        <path
          d="M 460,920
             C 640,940 780,1060 860,1160
             C 940,1260 1000,1290 1140,1260"
          fill="none"
          stroke={`url(#${prefix}-wave-top-highlight)`}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M 790,1300
             C 880,1400 970,1470 1140,1430
             L 1140,1470
             C 950,1510 860,1430 770,1330
             Z"
          fill={tones.waveUnderside}
          opacity="0.5"
        />
      </g>

      {/* 5. Bottom subtle corner balance */}
      <polygon
        points="-40,1800 300,1980 -40,1980"
        fill={tones.cornerBalance}
        opacity="0.5"
      />
    </svg>
  );
};

// ── 2. AURORA MESH BACKGROUND ───────────────────────────────────────────────
const AuroraMeshBackground = ({
  idPrefix = 'am',
  baseColor = '#078249',
  cornerStart,
  cornerEnd,
  waveColor,
}: PatternProps) => {
  const uid = React.useId().replace(/[:]/g, '');
  const prefix = `${idPrefix}-${uid}`;
  const tones = computePatternTones(baseColor, cornerStart, cornerEnd, waveColor);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1080 1920"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 pointer-events-none select-none"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <defs>
        <filter id={`${prefix}-blur-deep`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="110" />
        </filter>
        <filter id={`${prefix}-blur-mid`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="70" />
        </filter>
        <linearGradient id={`${prefix}-base`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor={tones.baseGrad0} />
          <stop offset="40%" stopColor={tones.baseGrad30} />
          <stop offset="80%" stopColor={tones.baseGrad65} />
          <stop offset="100%" stopColor={tones.baseGrad100} />
        </linearGradient>
        <linearGradient id={`${prefix}-ray-1`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={tones.ribbonTop0} stopOpacity="0.5" />
          <stop offset="60%" stopColor={tones.waveHighlight0} stopOpacity="0.2" />
          <stop offset="100%" stopColor={tones.baseGrad100} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${prefix}-ray-2`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tones.glowWave} stopOpacity="0.45" />
          <stop offset="50%" stopColor={tones.ribbonMid0} stopOpacity="0.15" />
          <stop offset="100%" stopColor={tones.baseGrad65} stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="1080" height="1920" fill={`url(#${prefix}-base)`} />

      {/* Atmospheric Aurora Fluid Blobs */}
      <g filter={`url(#${prefix}-blur-deep)`}>
        <ellipse cx="280" cy="380" rx="420" ry="340" fill={tones.ribbonTop0} opacity="0.7" />
        <ellipse cx="880" cy="720" rx="380" ry="460" fill={tones.waveBody0} opacity="0.6" />
        <ellipse cx="320" cy="1480" rx="460" ry="400" fill={tones.glowCenter} opacity="0.65" />
        <ellipse cx="860" cy="1580" rx="420" ry="360" fill={tones.ribbonMid0} opacity="0.55" />
      </g>

      {/* Sharper Fluid Accents & Light Rays */}
      <g filter={`url(#${prefix}-blur-mid)`}>
        <circle cx="540" cy="620" r="240" fill={tones.waveHighlight0} opacity="0.4" />
        <path
          d="M -100,200 Q 300,600 700,500 T 1200,900 L 1200,1400 Q 800,1000 400,1200 Z"
          fill={`url(#${prefix}-ray-1)`}
        />
        <path
          d="M 1180,600 Q 800,1000 500,1200 T -100,1600 L -100,1200 Q 300,900 700,700 Z"
          fill={`url(#${prefix}-ray-2)`}
        />
      </g>

      {/* Subtle fine celestial rings */}
      <ellipse cx="540" cy="960" rx="520" ry="880" fill="none" stroke={tones.lineStroke1} strokeWidth="1.5" strokeOpacity="0.2" />
      <ellipse cx="540" cy="960" rx="440" ry="780" fill="none" stroke={tones.lineStroke2} strokeWidth="1" strokeOpacity="0.15" />
    </svg>
  );
};

// ── 3. CYBER GRID BACKGROUND ───────────────────────────────────────────────
const CyberGridBackground = ({
  idPrefix = 'cg',
  baseColor = '#078249',
  cornerStart,
  cornerEnd,
  waveColor,
}: PatternProps) => {
  const uid = React.useId().replace(/[:]/g, '');
  const prefix = `${idPrefix}-${uid}`;
  const tones = computePatternTones(baseColor, cornerStart, cornerEnd, waveColor);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1080 1920"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 pointer-events-none select-none"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient id={`${prefix}-base`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tones.baseGrad0} />
          <stop offset="50%" stopColor={tones.baseGrad30} />
          <stop offset="100%" stopColor={tones.baseGrad100} />
        </linearGradient>
        <radialGradient id={`${prefix}-horizon-bloom`} cx="50%" cy="54%" r="45%">
          <stop offset="0%" stopColor={tones.glowWave} stopOpacity="0.55" />
          <stop offset="40%" stopColor={tones.ribbonTop0} stopOpacity="0.22" />
          <stop offset="100%" stopColor={tones.baseGrad100} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${prefix}-grid-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tones.lineStroke1} stopOpacity="0.05" />
          <stop offset="35%" stopColor={tones.lineStroke1} stopOpacity="0.55" />
          <stop offset="100%" stopColor={tones.waveHighlight0} stopOpacity="0.1" />
        </linearGradient>
      </defs>

      <rect width="1080" height="1920" fill={`url(#${prefix}-base)`} />
      <rect width="1080" height="1920" fill={`url(#${prefix}-horizon-bloom)`} />

      {/* Upper Tech Crosses */}
      <g stroke={tones.lineStroke1} strokeWidth="1.5" strokeOpacity="0.3">
        {[
          [160, 240], [920, 280], [220, 520], [860, 560], [140, 820], [940, 860]
        ].map(([x, y], idx) => (
          <g key={idx}>
            <line x1={x - 9} y1={y} x2={x + 9} y2={y} />
            <line x1={x} y1={y - 9} x2={x} y2={y + 9} />
          </g>
        ))}
      </g>

      {/* Perspective 3D Grid Floor */}
      <g stroke={`url(#${prefix}-grid-fade)`} strokeWidth="1.5">
        {[1040, 1090, 1150, 1220, 1300, 1390, 1490, 1600, 1720, 1850, 1990].map((y, idx) => (
          <line key={`h-${idx}`} x1="-200" y1={y} x2="1280" y2={y} strokeWidth={1 + idx * 0.25} />
        ))}
        {[-300, -150, 0, 120, 240, 360, 460, 540, 620, 720, 840, 960, 1080, 1230, 1380].map((x, idx) => (
          <line key={`v-${idx}`} x1={540} y1={1000} x2={x} y2={2020} strokeWidth={x === 540 ? 2 : 1.2} />
        ))}
      </g>

      {/* Horizon Laser Line */}
      <line x1="-100" y1="1000" x2="1180" y2="1000" stroke={tones.waveHighlight0} strokeWidth="2.5" strokeOpacity="0.65" />
    </svg>
  );
};

// ── 4. GLASS SPHERES BACKGROUND ────────────────────────────────────────────
const GlassSpheresBackground = ({
  idPrefix = 'gs',
  baseColor = '#078249',
  cornerStart,
  cornerEnd,
  waveColor,
}: PatternProps) => {
  const uid = React.useId().replace(/[:]/g, '');
  const prefix = `${idPrefix}-${uid}`;
  const tones = computePatternTones(baseColor, cornerStart, cornerEnd, waveColor);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1080 1920"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 pointer-events-none select-none"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient id={`${prefix}-base`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor={tones.baseGrad0} />
          <stop offset="45%" stopColor={tones.baseGrad30} />
          <stop offset="100%" stopColor={tones.baseGrad100} />
        </linearGradient>

        <filter id={`${prefix}-sphere-shadow`} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="20" dy="32" stdDeviation="28" floodColor="#000000" floodOpacity="0.45" />
        </filter>

        <radialGradient id={`${prefix}-sphere-1`} cx="32%" cy="30%" r="72%">
          <stop offset="0%" stopColor={tones.waveHighlight0} stopOpacity="0.95" />
          <stop offset="28%" stopColor={tones.ribbonTop0} stopOpacity="0.85" />
          <stop offset="70%" stopColor={tones.ribbonMid100} stopOpacity="0.95" />
          <stop offset="100%" stopColor={tones.ribbonBottom100} stopOpacity="1" />
        </radialGradient>

        <radialGradient id={`${prefix}-sphere-2`} cx="30%" cy="28%" r="75%">
          <stop offset="0%" stopColor={tones.glowWave} stopOpacity="0.95" />
          <stop offset="35%" stopColor={tones.waveBody0} stopOpacity="0.9" />
          <stop offset="75%" stopColor={tones.waveBody100} stopOpacity="0.95" />
          <stop offset="100%" stopColor={tones.waveUnderside} stopOpacity="1" />
        </radialGradient>

        <radialGradient id={`${prefix}-sphere-3`} cx="35%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="30%" stopColor={tones.ribbonTop0} stopOpacity="0.8" />
          <stop offset="100%" stopColor={tones.ribbonBottom0} stopOpacity="1" />
        </radialGradient>

        <linearGradient id={`${prefix}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="50%" stopColor={tones.waveHighlight0} stopOpacity="0.2" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      <rect width="1080" height="1920" fill={`url(#${prefix}-base)`} />

      <circle cx="200" cy="500" r="320" fill={tones.glowCenter} opacity="0.18" />
      <circle cx="950" cy="1150" r="380" fill={tones.glowWave} opacity="0.18" />

      {/* Sphere 1 (Top Left) */}
      <ellipse
        cx="140"
        cy="520"
        rx="340"
        ry="160"
        transform="rotate(-24 140 520)"
        fill="none"
        stroke={`url(#${prefix}-rim)`}
        strokeWidth="4"
        strokeOpacity="0.4"
      />
      <g filter={`url(#${prefix}-sphere-shadow)`}>
        <circle cx="140" cy="520" r="240" fill={`url(#${prefix}-sphere-1)`} />
        <ellipse cx="100" cy="460" rx="90" ry="55" transform="rotate(-30 100 460)" fill="#FFFFFF" opacity="0.4" />
      </g>

      {/* Sphere 2 (Right Edge) */}
      <ellipse
        cx="960"
        cy="1180"
        rx="400"
        ry="180"
        transform="rotate(28 960 1180)"
        fill="none"
        stroke={`url(#${prefix}-rim)`}
        strokeWidth="5"
        strokeOpacity="0.35"
      />
      <g filter={`url(#${prefix}-sphere-shadow)`}>
        <circle cx="960" cy="1180" r="300" fill={`url(#${prefix}-sphere-2)`} />
        <ellipse cx="910" cy="1100" rx="110" ry="70" transform="rotate(-25 910 1100)" fill="#FFFFFF" opacity="0.45" />
      </g>

      {/* Sphere 3 (Bottom Left Small Satellite) */}
      <g filter={`url(#${prefix}-sphere-shadow)`}>
        <circle cx="260" cy="1480" r="95" fill={`url(#${prefix}-sphere-3)`} />
        <ellipse cx="245" cy="1455" rx="35" ry="22" transform="rotate(-25 245 1455)" fill="#FFFFFF" opacity="0.6" />
      </g>
    </svg>
  );
};

// ── 5. TOPOGRAPHY CONTOUR BACKGROUND ────────────────────────────────────────
const TopographyBackground = ({
  idPrefix = 'tp',
  baseColor = '#078249',
  cornerStart,
  cornerEnd,
  waveColor,
}: PatternProps) => {
  const uid = React.useId().replace(/[:]/g, '');
  const prefix = `${idPrefix}-${uid}`;
  const tones = computePatternTones(baseColor, cornerStart, cornerEnd, waveColor);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1080 1920"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 pointer-events-none select-none"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient id={`${prefix}-base`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={tones.baseGrad0} />
          <stop offset="50%" stopColor={tones.baseGrad30} />
          <stop offset="100%" stopColor={tones.baseGrad100} />
        </linearGradient>

        <linearGradient id={`${prefix}-fill-1`} x1="0" y1="0" x2="1" y2="0.8">
          <stop offset="0%" stopColor={tones.ribbonTop0} stopOpacity="0.28" />
          <stop offset="100%" stopColor={tones.ribbonTop100} stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id={`${prefix}-fill-2`} x1="0" y1="0" x2="1" y2="0.8">
          <stop offset="0%" stopColor={tones.waveBody0} stopOpacity="0.24" />
          <stop offset="100%" stopColor={tones.waveBody100} stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id={`${prefix}-fill-3`} x1="0" y1="0" x2="1" y2="0.8">
          <stop offset="0%" stopColor={tones.ribbonMid0} stopOpacity="0.2" />
          <stop offset="100%" stopColor={tones.ribbonBottom100} stopOpacity="0.03" />
        </linearGradient>

        <filter id={`${prefix}-drop`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="8" dy="14" stdDeviation="16" floodColor="#000000" floodOpacity="0.35" />
        </filter>
      </defs>

      <rect width="1080" height="1920" fill={`url(#${prefix}-base)`} />

      {/* Layered Topographic Ridges */}
      <g filter={`url(#${prefix}-drop)`}>
        <path
          d="M -50,180 C 240,160 420,380 620,340 C 820,300 940,160 1140,220 L 1140,-50 L -50,-50 Z"
          fill={`url(#${prefix}-fill-1)`}
        />
        <path
          d="M -50,180 C 240,160 420,380 620,340 C 820,300 940,160 1140,220"
          fill="none"
          stroke={tones.lineStroke1}
          strokeWidth="3.5"
          strokeOpacity="0.65"
        />

        <path
          d="M -50,440 C 180,420 360,620 580,590 C 800,560 920,440 1140,510 L 1140,-50 L -50,-50 Z"
          fill={`url(#${prefix}-fill-2)`}
        />
        <path
          d="M -50,440 C 180,420 360,620 580,590 C 800,560 920,440 1140,510"
          fill="none"
          stroke={tones.waveHighlight0}
          strokeWidth="3"
          strokeOpacity="0.6"
        />

        <path
          d="M -50,780 C 220,740 380,980 680,940 C 980,900 1020,780 1140,840 L 1140,-50 L -50,-50 Z"
          fill={`url(#${prefix}-fill-3)`}
        />
        <path
          d="M -50,780 C 220,740 380,980 680,940 C 980,900 1020,780 1140,840"
          fill="none"
          stroke={tones.lineStroke2}
          strokeWidth="2.5"
          strokeOpacity="0.5"
        />

        <path
          d="M -50,1380 C 260,1260 480,1520 740,1440 C 980,1360 1040,1480 1140,1520 L 1140,2000 L -50,2000 Z"
          fill={`url(#${prefix}-fill-1)`}
        />
        <path
          d="M -50,1380 C 260,1260 480,1520 740,1440 C 980,1360 1040,1480 1140,1520"
          fill="none"
          stroke={tones.lineStroke1}
          strokeWidth="3"
          strokeOpacity="0.6"
        />

        <path
          d="M -50,1680 C 280,1600 520,1780 780,1720 C 960,1680 1060,1740 1140,1780 L 1140,2000 L -50,2000 Z"
          fill={`url(#${prefix}-fill-2)`}
        />
        <path
          d="M -50,1680 C 280,1600 520,1780 780,1720 C 960,1680 1060,1740 1140,1780"
          fill="none"
          stroke={tones.waveHighlight0}
          strokeWidth="2.5"
          strokeOpacity="0.5"
        />
      </g>

      <g stroke={tones.lineStroke1} strokeWidth="1" strokeOpacity="0.25" fill="none">
        <path d="M -50,280 C 240,260 420,480 620,440 C 820,400 940,260 1140,320" />
        <path d="M -50,580 C 180,560 360,760 580,730 C 800,700 920,580 1140,650" strokeDasharray="6,8" />
        <path d="M -50,1180 C 220,1140 380,1380 680,1340 C 980,1300 1020,1180 1140,1240" />
        <path d="M -50,1520 C 260,1400 480,1660 740,1580 C 980,1500 1040,1620 1140,1660" strokeDasharray="6,8" />
      </g>
    </svg>
  );
};

// ── 6. CRYSTAL PRISM BACKGROUND ─────────────────────────────────────────────
const CrystalPrismBackground = ({
  idPrefix = 'cp',
  baseColor = '#078249',
  cornerStart,
  cornerEnd,
  waveColor,
}: PatternProps) => {
  const uid = React.useId().replace(/[:]/g, '');
  const prefix = `${idPrefix}-${uid}`;
  const tones = computePatternTones(baseColor, cornerStart, cornerEnd, waveColor);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1080 1920"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 pointer-events-none select-none"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient id={`${prefix}-base`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor={tones.baseGrad0} />
          <stop offset="50%" stopColor={tones.baseGrad30} />
          <stop offset="100%" stopColor={tones.baseGrad100} />
        </linearGradient>

        <filter id={`${prefix}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="12" dy="20" stdDeviation="22" floodColor="#000000" floodOpacity="0.45" />
        </filter>

        <linearGradient id={`${prefix}-f1`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={tones.ribbonTop0} />
          <stop offset="100%" stopColor={tones.ribbonTop100} />
        </linearGradient>
        <linearGradient id={`${prefix}-f2`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tones.waveHighlight0} />
          <stop offset="100%" stopColor={tones.waveBody100} />
        </linearGradient>
        <linearGradient id={`${prefix}-f3`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor={tones.ribbonMid0} />
          <stop offset="100%" stopColor={tones.ribbonBottom100} />
        </linearGradient>
        <linearGradient id={`${prefix}-f4`} x1="0" y1="0" x2="1" y2="0.8">
          <stop offset="0%" stopColor={tones.waveBody0} />
          <stop offset="100%" stopColor={tones.baseGrad100} />
        </linearGradient>
      </defs>

      <rect width="1080" height="1920" fill={`url(#${prefix}-base)`} />

      {/* Top-Left Crystal Prism Cluster */}
      <g id={`${prefix}-top-cluster`} filter={`url(#${prefix}-shadow)`}>
        <polygon points="-60,-60 380,-60 180,340" fill={`url(#${prefix}-f1)`} />
        <polygon points="380,-60 620,-60 480,240 180,340" fill={`url(#${prefix}-f2)`} />
        <polygon points="-60,-60 180,340 -60,540" fill={`url(#${prefix}-f3)`} />
        <polygon points="180,340 480,240 360,580 60,680" fill={`url(#${prefix}-f1)`} />
        <polygon points="-60,540 60,680 -60,860" fill={`url(#${prefix}-f4)`} />
        <polygon points="60,680 360,580 240,920" fill={`url(#${prefix}-f2)`} />

        <line x1="-60" y1="-60" x2="180" y2="340" stroke="#FFFFFF" strokeWidth="2.5" strokeOpacity="0.4" />
        <line x1="380" y1="-60" x2="180" y2="340" stroke={tones.lineStroke1} strokeWidth="2" strokeOpacity="0.5" />
        <line x1="180" y1="340" x2="360" y2="580" stroke="#FFFFFF" strokeWidth="2.5" strokeOpacity="0.45" />
        <line x1="60" y1="680" x2="360" y2="580" stroke={tones.lineStroke2} strokeWidth="2" strokeOpacity="0.4" />
      </g>

      {/* Bottom-Right Crystal Prism Cluster */}
      <g id={`${prefix}-bottom-cluster`} filter={`url(#${prefix}-shadow)`}>
        <polygon points="1140,1980 720,1980 920,1580" fill={`url(#${prefix}-f2)`} />
        <polygon points="720,1980 480,1980 620,1680 920,1580" fill={`url(#${prefix}-f3)`} />
        <polygon points="1140,1980 920,1580 1140,1380" fill={`url(#${prefix}-f1)`} />
        <polygon points="920,1580 620,1680 740,1340 1020,1240" fill={`url(#${prefix}-f4)`} />
        <polygon points="1140,1380 1020,1240 1140,1060" fill={`url(#${prefix}-f2)`} />
        <polygon points="1020,1240 740,1340 840,1000" fill={`url(#${prefix}-f1)`} />

        <line x1="1140" y1="1980" x2="920" y2="1580" stroke="#FFFFFF" strokeWidth="2.5" strokeOpacity="0.4" />
        <line x1="920" y1="1580" x2="740" y2="1340" stroke="#FFFFFF" strokeWidth="2.5" strokeOpacity="0.45" />
        <line x1="1020" y1="1240" x2="740" y2="1340" stroke={tones.lineStroke1} strokeWidth="2" strokeOpacity="0.4" />
      </g>
    </svg>
  );
};

const DESIGNER_PATTERNS = [
  {
    id: 'none',
    name: 'Classic Gradient',
    desc: 'Solid or linear palette',
    badge: 'Standard',
  },
  {
    id: 'emerald-wave',
    name: 'Wave & Ribbons',
    desc: '3D ribbon facets & curved wave',
    badge: 'Play Store',
  },
  {
    id: 'aurora-mesh',
    name: 'Aurora Glow Mesh',
    desc: 'Cosmic multi-point fluid bloom',
    badge: 'Trending',
  },
  {
    id: 'cyber-grid',
    name: 'Cyber 3D Grid',
    desc: 'Horizon wireframe & tech coordinates',
    badge: 'Web3 / Dev',
  },
  {
    id: 'glass-spheres',
    name: 'Floating Glass Orbs',
    desc: '3D glossy specular refraction spheres',
    badge: 'Fintech / Luxury',
  },
  {
    id: 'topography-contour',
    name: 'Topographic Waves',
    desc: 'Elevation contour lines & relief fills',
    badge: 'Maps / Outdoor',
  },
  {
    id: 'crystal-prism',
    name: 'Crystal Prism Facets',
    desc: '3D diamond corner facets & refraction',
    badge: 'Geometric',
  },
] as const;

const MockupTemplate = ({
  screenshot,
  settings,
  id,
  draggingTarget,
  selectedLayer,
  onStartDrag,
  onSelectLayer,
  showGuides = false,
}: {
  key?: React.Key;
  screenshot: Screenshot;
  settings: Settings;
  id?: string;
  draggingTarget?: 'text' | 'device' | null;
  selectedLayer?: 'text' | 'device' | null;
  onStartDrag?: (target: 'text' | 'device', e: React.PointerEvent) => void;
  onSelectLayer?: (target: 'text' | 'device') => void;
  showGuides?: boolean;
}) => {
  const { layout } = settings;
  const dragEnabled = Boolean(onStartDrag);
  const interactive = Boolean(onSelectLayer);
  const textVisible = screenshot.textVisible !== false;
  const deviceVisible = screenshot.deviceVisible !== false;
  const textLocked = screenshot.textLocked === true;
  const deviceLocked = screenshot.deviceLocked === true;
  const titleParts = screenshot.title.split(/(\[accent\][\s\S]*?\[\/accent\])/g).filter(Boolean);
  const baseDeviceOffsetY =
    settings.phonePositionMode === 'half-down'
      ? layout === 'text-top'
        ? 120
        : layout === 'centered'
          ? 64
          : 60
      : settings.phonePositionMode === 'half-up'
        ? layout === 'text-bottom'
          ? -160
          : -90
        : 0;

  const shadowOpacity = Math.min(0.34, Math.max(0.1, settings.deviceShadow / 120));
  const shadowStyle = {
    boxShadow: `0 ${Math.round(settings.deviceShadow * 1.2)}px ${Math.round(settings.deviceShadow * 2.6)}px -18px rgba(15,23,42,${shadowOpacity})`,
  };

  const getTextAlignClass = () => {
    switch (settings.textAlign) {
      case 'left': return 'text-left items-start';
      case 'right': return 'text-right items-end';
      case 'center':
      default: return 'text-center items-center';
    }
  };

  const getDeviceAlignClass = () => {
    switch (settings.deviceAlign) {
      case 'left': return 'justify-start px-16';
      case 'right': return 'justify-end px-16';
      case 'center':
      default: return 'justify-center';
    }
  };

  const interactiveClass = (locked: boolean) =>
    interactive
      ? locked
        ? 'cursor-default select-none'
        : dragEnabled
          ? 'cursor-move touch-none select-none'
          : 'cursor-pointer select-none'
      : '';

  const TextContent = () => {
    if (!textVisible) return null;
    return (
      <div
        className={`w-full flex flex-col px-16 ${getTextAlignClass()} ${interactiveClass(textLocked)}`}
        style={{
          transform: `translate(${screenshot.textOffset.x}px, ${screenshot.textOffset.y}px)`,
          outline: interactive && selectedLayer === 'text' ? '3px solid rgba(99, 102, 241, 0.72)' : undefined,
          outlineOffset: interactive && selectedLayer === 'text' ? '10px' : undefined,
        }}
        onPointerDown={interactive ? (e) => {
          onSelectLayer?.('text');
          if (dragEnabled && !textLocked) onStartDrag?.('text', e);
        } : undefined}
      >
        <h1
          style={{
            color: settings.titleColor,
            fontSize: `${settings.titleFontSize}px`,
            fontWeight: settings.titleFontWeight,
            lineHeight: settings.titleLineHeight,
            fontFamily: settings.titleFontFamily,
            letterSpacing: `${settings.titleLetterSpacing}px`,
          }}
          className="whitespace-pre-wrap break-words"
        >
          {titleParts.map((part, idx) => {
            const match = part.match(/^\[accent\]([\s\S]*?)\[\/accent\]$/);
            if (!match) return <React.Fragment key={`title-part-${idx}`}>{part}</React.Fragment>;
            return (
              <span key={`title-part-${idx}`} style={{ color: settings.accentColor }}>
                {match[1]}
              </span>
            );
          })}
        </h1>
        {screenshot.subtitle && (
          <p
            style={{
              color: settings.subtitleColor,
              fontSize: `${settings.subtitleFontSize}px`,
              fontWeight: settings.subtitleFontWeight,
              opacity: 0.9,
              fontFamily: settings.subtitleFontFamily,
              lineHeight: settings.subtitleLineHeight,
              letterSpacing: `${settings.subtitleLetterSpacing}px`,
              marginTop: `${settings.textSpacing}px`,
            }}
            className="whitespace-pre-wrap break-words"
          >
            {screenshot.subtitle}
          </p>
        )}
      </div>
    );
  };

  const DeviceFrame = ({ bleed }: { bleed: 'top' | 'bottom' | 'none' }) => {
    const isBleedBottom = bleed === 'bottom';
    const isBleedTop = bleed === 'top';
    const isNone = bleed === 'none';
    const frame = DEVICE_FRAMES.find((option) => option.id === settings.deviceFrameStyle) ?? DEVICE_FRAMES[0];
    const outerRadius = Math.max(0, settings.deviceCornerRadius);
    const innerRadius = Math.max(0, Math.round(outerRadius * 0.82));
    const frameColor = settings.deviceFrameColor || frame.shell;
    const edgeColor = settings.deviceFrameEdgeColor || frame.edge;
    const imgClasses = `block h-full w-full object-top ${settings.imageFit === 'contain' ? 'object-contain bg-gray-100' : 'object-cover'}`;
    const isLandscapeDevice = settings.deviceOrientation === 'landscape';
    const portraitRatios: Record<Settings['deviceType'], number> = {
      iphone: 9 / 19.5,
      android: 9 / 20,
      tablet: 3 / 4,
      laptop: 16 / 10,
      browser: 16 / 10,
    };
    const baseAspectRatio = portraitRatios[settings.deviceType];
    const deviceAspectRatio = settings.deviceType === 'laptop' || settings.deviceType === 'browser'
      ? baseAspectRatio
      : isLandscapeDevice
        ? 1 / baseAspectRatio
        : baseAspectRatio;
    const baseWidth = settings.canvasWidth * (settings.deviceScale / 100);
    const isWideCanvas = settings.canvasWidth / settings.canvasHeight >= 0.85;
    const wideCanvasCap = (settings.canvasHeight * (layout === 'centered' ? 0.68 : 0.62)) * deviceAspectRatio;
    const landscapeCap = Math.min(settings.canvasWidth * 0.9, settings.canvasHeight * 0.62 * deviceAspectRatio);
    const deviceWidth = isLandscapeDevice
      ? Math.min(baseWidth, landscapeCap)
      : isWideCanvas
        ? Math.min(baseWidth, wideCanvasCap)
        : baseWidth;
    const screenshotStyle: React.CSSProperties = {
      transform: `translate(${settings.screenshotOffsetX}px, ${settings.screenshotOffsetY}px) scale(${settings.screenshotScale / 100}) rotate(${settings.screenshotRotation}deg)`,
      filter: `brightness(${settings.screenshotBrightness}%) contrast(${settings.screenshotContrast}%) saturate(${settings.screenshotSaturation}%)`,
      transformOrigin: 'center',
    };

    if (!settings.deviceFrame) {
      return (
        <img
          src={screenshot.url}
          className={`relative flex-shrink-0 overflow-hidden ${imgClasses}`}
          style={{
            width: `${deviceWidth}px`,
            aspectRatio: `${deviceAspectRatio}`,
            borderRadius: `${outerRadius}px`,
            ...shadowStyle,
            outline: interactive && selectedLayer === 'device' ? '3px solid rgba(99, 102, 241, 0.72)' : undefined,
            outlineOffset: interactive && selectedLayer === 'device' ? '10px' : undefined,
            transform: `${screenshotStyle.transform} scaleX(${settings.deviceFlipX ? -1 : 1}) scaleY(${settings.deviceFlipY ? -1 : 1})`,
            filter: screenshotStyle.filter,
          }}
          alt="App Screenshot"
        />
      );
    }

    return (
      <div
        className="relative flex-shrink-0"
        style={{
          width: `${deviceWidth}px`,
          aspectRatio: `${deviceAspectRatio}`,
          padding: `${settings.deviceBorder}px`,
          borderRadius: `${outerRadius}px`,
          background: `linear-gradient(145deg, ${edgeColor}, ${frameColor} 42%, ${edgeColor} 100%)`,
          boxShadow: `${shadowStyle.boxShadow}, inset 0 0 0 1px rgba(255,255,255,0.24)`,
          outline: interactive && selectedLayer === 'device' ? '3px solid rgba(99, 102, 241, 0.72)' : undefined,
          outlineOffset: interactive && selectedLayer === 'device' ? '10px' : undefined,
        }}
      >
        <div
          className="relative w-full h-full overflow-hidden bg-white"
          style={{ borderRadius: `${innerRadius}px` }}
        >
          <img src={screenshot.url} className={imgClasses} style={screenshotStyle} alt="App Screenshot" />
          {settings.deviceFrameStyle !== 'minimal' && settings.deviceType === 'iphone' && (
            <span className="absolute left-1/2 top-3.5 h-6 w-[25%] -translate-x-1/2 rounded-full shadow-sm" style={{ backgroundColor: frame.island }} />
          )}
          {settings.deviceFrameStyle !== 'minimal' && settings.deviceType === 'android' && (
            <span className="absolute left-1/2 top-3 h-4 w-4 -translate-x-1/2 rounded-full shadow-sm" style={{ backgroundColor: frame.island }} />
          )}
          {settings.deviceType === 'browser' && (
            <div className="absolute left-0 right-0 top-0 flex h-11 items-center gap-2 border-b border-slate-200 bg-slate-100 px-4">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
              <span className="ml-2 h-6 flex-1 rounded-md bg-white/90" />
            </div>
          )}
        </div>
        {isNone && settings.deviceFrameStyle !== 'minimal' && (settings.deviceType === 'iphone' || settings.deviceType === 'android') && (
          <>
            <span className="absolute -left-[3px] top-[18%] h-20 w-[3px] rounded-l-full" style={{ backgroundColor: frameColor }} />
            <span className="absolute -left-[3px] top-[28%] h-28 w-[3px] rounded-l-full" style={{ backgroundColor: frameColor }} />
            <span className="absolute -right-[3px] top-[24%] h-36 w-[3px] rounded-r-full" style={{ backgroundColor: frameColor }} />
          </>
        )}
      </div>
    );
  };

  const DeviceWrapper = ({ bleed, className }: { bleed: 'top' | 'bottom' | 'none'; className: string }) => {
    if (!deviceVisible) return null;
    return (
      <div
        className={`${className} ${interactiveClass(deviceLocked)}`}
        style={{
          transform: `perspective(1600px) translate(${screenshot.deviceOffset.x}px, ${screenshot.deviceOffset.y + baseDeviceOffsetY}px) rotateX(${settings.deviceTiltX}deg) rotateY(${settings.deviceTiltY}deg) rotateZ(${settings.deviceRotation}deg)`,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
        onPointerDown={interactive ? (e) => {
          onSelectLayer?.('device');
          if (dragEnabled && !deviceLocked) onStartDrag?.('device', e);
        } : undefined}
      >
        <DeviceFrame bleed={bleed} />
      </div>
    );
  };

  const patternType =
    settings.backgroundPattern === 'wave-ribbons'
      ? 'emerald-wave'
      : settings.backgroundPattern ||
      (typeof settings.background === 'string' && settings.background.includes('#057a44') ? 'emerald-wave' : 'none');

  const patternCommonProps = {
    idPrefix: id || 'canvas',
    baseColor: settings.backgroundPatternColor || '#009e52',
    cornerStart: settings.backgroundPatternCornerStart,
    cornerEnd: settings.backgroundPatternCornerEnd,
    waveColor: settings.backgroundPatternWaveColor,
  };

  return (
    <div
      id={id}
      className="relative flex flex-col overflow-hidden"
      style={{ width: settings.canvasWidth, height: settings.canvasHeight, background: settings.background }}
    >
      {patternType !== 'none' && (
        <div className="mockup-bg-pattern absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
          {patternType === 'emerald-wave' && <EmeraldWaveBackground {...patternCommonProps} />}
          {patternType === 'aurora-mesh' && <AuroraMeshBackground {...patternCommonProps} />}
          {patternType === 'cyber-grid' && <CyberGridBackground {...patternCommonProps} />}
          {patternType === 'glass-spheres' && <GlassSpheresBackground {...patternCommonProps} />}
          {patternType === 'topography-contour' && <TopographyBackground {...patternCommonProps} />}
          {patternType === 'crystal-prism' && <CrystalPrismBackground {...patternCommonProps} />}
        </div>
      )}

      {layout === 'text-top' && (
        <>
          <div className="flex-none pt-24 pb-12 z-10 flex flex-col items-center justify-center w-full">
            <TextContent />
          </div>
          <DeviceWrapper
            bleed={settings.phonePositionMode === 'centered' ? 'none' : 'bottom'}
            className={`flex-1 w-full flex ${getDeviceAlignClass()} relative z-10 ${settings.phonePositionMode === 'centered' ? 'items-start pt-8' : 'items-start pt-16'
              }`}
          />
        </>
      )}

      {layout === 'text-bottom' && (
        <>
          <DeviceWrapper
            bleed={settings.phonePositionMode === 'centered' ? 'none' : 'top'}
            className={`flex-1 w-full flex ${getDeviceAlignClass()} relative z-10 items-start ${settings.phonePositionMode === 'half-up'
                ? 'pt-0'
                : settings.phonePositionMode === 'centered'
                  ? 'pt-12'
                  : 'pt-16'
              }`}
          />
          <div className="flex-none pt-6 pb-20 z-10 flex flex-col items-center justify-center w-full">
            <TextContent />
          </div>
        </>
      )}

      {layout === 'centered' && (
        <>
          <div className="flex-none pt-24 pb-8 z-10 flex flex-col items-center justify-center w-full">
            <TextContent />
          </div>
          <DeviceWrapper bleed="none" className={`flex-1 w-full flex ${getDeviceAlignClass()} relative z-10 items-center pb-16`} />
        </>
      )}

      {showGuides && (
        <div className="pointer-events-none absolute inset-0 z-20">
          <div className="absolute inset-[5%] rounded-sm border-2 border-dashed border-fuchsia-500/70" />
          <div className="absolute left-1/2 top-0 h-full w-px bg-cyan-500/60" />
          <div className="absolute left-0 top-1/2 h-px w-full bg-cyan-500/60" />
        </div>
      )}

      {interactive && (
        <div className="absolute top-6 right-6 flex gap-2 z-30 pointer-events-none">
          {textVisible && (
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${draggingTarget === 'text' || selectedLayer === 'text'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white/90 text-gray-700 border-gray-200'
                }`}
            >
              Text{textLocked ? ' · Locked' : ''}
            </span>
          )}
          {deviceVisible && (
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${draggingTarget === 'device' || selectedLayer === 'device'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white/90 text-gray-700 border-gray-200'
                }`}
            >
              Device{deviceLocked ? ' · Locked' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedSlideIds, setSelectedSlideIds] = useState<string[]>([]);
  const [projectName, setProjectName] = useState('Untitled project');
  const [brandKit, setBrandKit] = useState<BrandKit>({
    name: 'My brand',
    primary: '#2563EB',
    secondary: '#0F172A',
    fontFamily: "'Inter', sans-serif",
  });
  const [activeLocale, setActiveLocale] = useState('en-US');
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [applyToAll, setApplyToAll] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [dragMode, setDragMode] = useState(true);
  const [draggingTarget, setDraggingTarget] = useState<'text' | 'device' | null>(null);
  const [draggedSlideId, setDraggedSlideId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [jsonImportError, setJsonImportError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ past: EditorSnapshot[]; future: EditorSnapshot[] }>({
    past: [],
    future: [],
  });
  const [hasPendingHistory, setHasPendingHistory] = useState(false);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    presets: true,
    layout: true,
    device: true,
    typography: false,
  });
  const [appPresets, setAppPresets] = useState<AppPreset[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_PRESETS;
    try {
      const raw = window.localStorage.getItem(PRESET_STORAGE_KEY);
      if (!raw) return DEFAULT_PRESETS;
      const parsed = JSON.parse(raw) as AppPreset[];
      if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PRESETS;

      const existingIds = new Set(parsed.map((p) => p.id));
      const missingDefaults = DEFAULT_PRESETS.filter((dp) => !existingIds.has(dp.id));
      const combined = [...parsed, ...missingDefaults];

      if (!window.localStorage.getItem(PRESET_TRANSFORM_MIGRATION_KEY)) {
        window.localStorage.setItem(PRESET_TRANSFORM_MIGRATION_KEY, 'complete');
        return combined.map((preset) =>
          BUILT_IN_PRESET_IDS.has(preset.id)
            ? { ...preset, settings: { ...preset.settings, ...ZERO_DEVICE_TRANSFORMS } }
            : preset
        );
      }

      return combined;
    } catch {
      return DEFAULT_PRESETS;
    }
  });
  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_PRESETS[0].id;
    return window.localStorage.getItem(PRESET_SELECTION_KEY) || DEFAULT_PRESETS[0].id;
  });
  const [presetDraft, setPresetDraft] = useState({
    name: DEFAULT_PRESETS[0].name,
    title: DEFAULT_PRESETS[0].title,
    subtitle: DEFAULT_PRESETS[0].subtitle,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const historyCurrentRef = useRef<EditorSnapshot | null>(null);
  const historyTimerRef = useRef<number | null>(null);
  const isRestoringHistoryRef = useRef(false);
  const projectHydratedRef = useRef(false);
  const projectSaveTimerRef = useRef<number | null>(null);
  const [fitScale, setFitScale] = useState(0.2);
  const [zoomScale, setZoomScale] = useState(0.2);
  const [exportScale, setExportScale] = useState<1 | 2 | 3>(1);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [exportQuality, setExportQuality] = useState(0.92);
  const [transparentExport, setTransparentExport] = useState(false);
  const [filenamePattern, setFilenamePattern] = useState('{project}-{locale}-{index}-{width}x{height}');
  const [showGuides, setShowGuides] = useState(false);
  const [activeTool, setActiveTool] = useState<SectionKey>('presets');
  const [inspectorTab, setInspectorTab] = useState<'content' | 'position' | 'export'>('content');
  const [selectedLayer, setSelectedLayer] = useState<'text' | 'device' | null>('device');
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string; tone: 'success' | 'error' } | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startOffset: Point;
    target: 'text' | 'device';
    activeId: string;
  } | null>(null);

  const activeScreenshot = screenshots[activeIndex];
  const localizedActiveScreenshot = activeScreenshot && activeLocale !== 'en-US'
    ? {
      ...activeScreenshot,
      ...(activeScreenshot.translations?.[activeLocale] ?? {
        title: activeScreenshot.title,
        subtitle: activeScreenshot.subtitle,
      }),
    }
    : activeScreenshot;
  const hasSlides = screenshots.length > 0;
  const mediaLibrary = Array.from(
    new Map<string, Screenshot>(screenshots.map((slide) => [slide.url, slide] as const)).values()
  );
  const selectedPreset =
    appPresets.find((p) => p.id === selectedPresetId) || appPresets[0] || DEFAULT_PRESETS[0];
  const activeSettings = activeScreenshot
    ? { ...settings, ...activeScreenshot.settingsOverrides }
    : settings;
  const showLeftPanel = leftPanelOpen && !focusMode;
  const showRightPanel = rightPanelOpen && !focusMode;
  const activeCanvasPreset = CANVAS_PRESETS.find((preset) =>
    preset.width === activeSettings.canvasWidth && preset.height === activeSettings.canvasHeight
  );
  const exportChecks = activeScreenshot ? [
    { ok: activeScreenshot.title.trim().length > 0, label: 'Headline is present' },
    { ok: activeScreenshot.subtitle.trim().length > 0, label: 'Subtitle is present' },
    { ok: Boolean(activeCanvasPreset), label: activeCanvasPreset ? `${activeCanvasPreset.label} dimensions` : 'Uses custom dimensions' },
    { ok: activeSettings.canvasWidth >= 1080 || activeSettings.canvasHeight >= 1080, label: 'High-resolution canvas' },
  ] : [];

  const notify = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToast({ id, message, tone });
    window.setTimeout(() => {
      setToast((current) => current?.id === id ? null : current);
    }, 3200);
  }, []);

  useEffect(() => {
    if (window.innerWidth < 1100) {
      setLeftPanelOpen(false);
      setRightPanelOpen(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadLocalProject()
      .then((project) => {
        if (cancelled || !project) return;
        setProjectName(project.name || 'Untitled project');
        setBrandKit(project.brandKit ?? {
          name: 'My brand',
          primary: project.settings?.accentColor ?? '#2563EB',
          secondary: project.settings?.titleColor ?? '#0F172A',
          fontFamily: project.settings?.titleFontFamily ?? "'Inter', sans-serif",
        });
        setActiveLocale(project.activeLocale ?? 'en-US');
        setVersions(project.versions ?? []);
        setSettings({ ...DEFAULT_SETTINGS, ...project.settings });
        setScreenshots(project.screenshots ?? []);
        setActiveIndex(Math.max(0, Math.min(project.activeIndex ?? 0, Math.max(0, (project.screenshots?.length ?? 1) - 1))));
      })
      .catch((error) => console.warn('Could not restore local project', error))
      .finally(() => {
        if (!cancelled) projectHydratedRef.current = true;
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!projectHydratedRef.current) return;
    if (projectSaveTimerRef.current !== null) window.clearTimeout(projectSaveTimerRef.current);
    projectSaveTimerRef.current = window.setTimeout(() => {
      saveLocalProject({
        name: projectName.trim() || 'Untitled project',
        settings,
        screenshots,
        activeIndex,
        updatedAt: Date.now(),
        brandKit,
        activeLocale,
        versions,
      }).catch((error) => {
        console.warn('Could not autosave project', error);
        notify('Local storage is full. Export a project backup.', 'error');
      });
      projectSaveTimerRef.current = null;
    }, 500);
    return () => {
      if (projectSaveTimerRef.current !== null) {
        window.clearTimeout(projectSaveTimerRef.current);
        projectSaveTimerRef.current = null;
      }
    };
  }, [activeIndex, activeLocale, brandKit, notify, projectName, screenshots, settings, versions]);

  useEffect(() => {
    const preset = appPresets.find((p) => p.id === selectedPresetId);
    if (!preset) return;
    setPresetDraft({
      name: preset.name,
      title: preset.title,
      subtitle: preset.subtitle,
    });
    setSettings((prev) => ({ ...prev, ...preset.settings }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPresetId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(appPresets));
  }, [appPresets]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PRESET_SELECTION_KEY, selectedPresetId);
  }, [selectedPresetId]);

  useEffect(() => {
    const next = cloneEditorSnapshot(settings, screenshots, activeIndex);
    const previous = historyCurrentRef.current;

    if (isRestoringHistoryRef.current) {
      isRestoringHistoryRef.current = false;
      historyCurrentRef.current = next;
      setHasPendingHistory(false);
      return;
    }

    if (!previous) {
      historyCurrentRef.current = next;
      return;
    }

    if (snapshotsMatch(previous, next)) {
      historyCurrentRef.current = next;
      return;
    }

    setHasPendingHistory(true);
    setHistory((current) => current.future.length > 0 ? { ...current, future: [] } : current);
    if (historyTimerRef.current !== null) window.clearTimeout(historyTimerRef.current);
    historyTimerRef.current = window.setTimeout(() => {
      setHistory((current) => ({
        past: [...current.past, previous].slice(-50),
        future: [],
      }));
      historyCurrentRef.current = next;
      historyTimerRef.current = null;
      setHasPendingHistory(false);
    }, 250);

    return () => {
      if (historyTimerRef.current !== null) {
        window.clearTimeout(historyTimerRef.current);
        historyTimerRef.current = null;
      }
    };
  }, [settings, screenshots, activeIndex]);

  const toggleSection = (key: SectionKey) => {
    setActiveTool(key);
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const focusSection = (key: SectionKey) => {
    setActiveTool(key);
    setOpenSections((prev) => ({ ...prev, [key]: true }));
    window.requestAnimationFrame(() => {
      document.getElementById(`section-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const updateFitScale = useCallback(() => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const availableWidth = Math.max(0, width - 64);
    const availableHeight = Math.max(0, height - 64);
    const scaleX = availableWidth / activeSettings.canvasWidth;
    const scaleY = availableHeight / activeSettings.canvasHeight;
    setFitScale(Math.min(scaleX, scaleY));
  }, [activeSettings.canvasHeight, activeSettings.canvasWidth]);

  useEffect(() => {
    updateFitScale();
    const resizeObserver = new ResizeObserver(() => updateFitScale());
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', updateFitScale);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateFitScale);
    };
  }, [screenshots.length, updateFitScale]);

  useEffect(() => {
    setZoomScale(fitScale);
  }, [fitScale]);

  // Removed faulty useEffect that was revoking blob URLs on every screenshots change

  const updateSetting = (updates: Partial<Settings>) => {
    setAppPresets((prev) =>
      prev.map((preset) =>
        preset.id === selectedPresetId
          ? { ...preset, settings: { ...preset.settings, ...updates } }
          : preset
      )
    );
    if (applyToAll) {
      setSettings((s) => ({ ...s, ...updates }));
      setScreenshots((prev) =>
        prev.map((s) => {
          if (!s.settingsOverrides) return s;
          const newOverrides = { ...s.settingsOverrides };
          Object.keys(updates).forEach((k) => delete newOverrides[k as keyof Settings]);
          return { ...s, settingsOverrides: newOverrides };
        })
      );
    } else {
      setScreenshots((prev) =>
        prev.map((s, i) => {
          if (i !== activeIndex) return s;
          return { ...s, settingsOverrides: { ...s.settingsOverrides, ...updates } };
        })
      );
    }
  };

  const snapshotPresetSettings = (): Partial<Settings> => ({ ...activeSettings });

  const buildPresetPayload = (nameOverride?: string) => {
    const name = (nameOverride || presetDraft.name || '').trim() || selectedPreset.name || 'Custom Preset';
    const title = presetDraft.title || activeScreenshot?.title || selectedPreset.title || '';
    const subtitle = presetDraft.subtitle || activeScreenshot?.subtitle || selectedPreset.subtitle || '';
    const currentSlides: PresetSlide[] = screenshots.map((s, idx) => ({
      index: idx,
      title: s.title,
      subtitle: s.subtitle,
      settingsOverrides: s.settingsOverrides ? { ...s.settingsOverrides } : undefined,
    }));

    return {
      name,
      title,
      subtitle,
      settings: snapshotPresetSettings(),
      slides: currentSlides.length > 0 ? currentSlides : selectedPreset.slides,
    };
  };

  const savePresetChanges = () => {
    const payload = buildPresetPayload();
    setAppPresets((prev) =>
      prev.map((p) => (p.id === selectedPreset.id ? { ...p, ...payload } : p))
    );
    notify(`Preset "${payload.name}" updated successfully`);
  };

  const createPreset = () => {
    const payload = buildPresetPayload();
    const newId = `preset-${Date.now()}`;
    const newPreset: AppPreset = { id: newId, ...payload };
    setAppPresets((prev) => [...prev, newPreset]);
    setSelectedPresetId(newId);
    notify(`New preset "${payload.name}" created and saved!`);
  };

  const deletePreset = () => {
    if (appPresets.length <= 1) return;
    const deletedName = selectedPreset.name;
    const filtered = appPresets.filter((p) => p.id !== selectedPreset.id);
    setAppPresets(filtered);
    setSelectedPresetId(filtered[0].id);
    notify(`Preset "${deletedName}" deleted`);
  };

  const applyPresetToSlides = (scope: 'current' | 'all') => {
    if (!selectedPreset) return;
    if (scope === 'all') {
      setSettings((prev) => ({ ...prev, ...selectedPreset.settings }));
      setScreenshots((prev) =>
        prev.map((slide, i) => {
          const slideData = selectedPreset.slides?.find((s) => s.index === i) ??
            selectedPreset.slides?.[i];
          return {
            ...slide,
            title: slideData?.title ?? selectedPreset.title ?? slide.title,
            subtitle: slideData?.subtitle ?? selectedPreset.subtitle ?? slide.subtitle,
            textOffset: { x: 0, y: 0 },
            deviceOffset: { x: 0, y: 0 },
            settingsOverrides: slideData?.settingsOverrides
              ? { ...selectedPreset.settings, ...slideData.settingsOverrides }
              : undefined,
          };
        })
      );
      notify(`Applied "${selectedPreset.name}" to all slides`);
      return;
    }
    if (!activeScreenshot) return;
    const slideData = selectedPreset.slides?.find((s) => s.index === activeIndex) ??
      selectedPreset.slides?.[activeIndex];
    setScreenshots((prev) =>
      prev.map((slide, index) => {
        if (index !== activeIndex) return slide;
        return {
          ...slide,
          title: slideData?.title ?? selectedPreset.title ?? slide.title,
          subtitle: slideData?.subtitle ?? selectedPreset.subtitle ?? slide.subtitle,
          textOffset: { x: 0, y: 0 },
          deviceOffset: { x: 0, y: 0 },
          settingsOverrides: slideData?.settingsOverrides
            ? { ...slide.settingsOverrides, ...selectedPreset.settings, ...slideData.settingsOverrides }
            : { ...slide.settingsOverrides, ...selectedPreset.settings },
        };
      })
    );
    notify(`Applied "${selectedPreset.name}" to current slide`);
  };

  const syncPresetDraftFromCanvas = () => {
    if (activeScreenshot) {
      setPresetDraft((prev) => ({
        ...prev,
        title: activeScreenshot.title,
        subtitle: activeScreenshot.subtitle,
      }));
      notify('Synced title & subtitle from active slide');
    }
  };

  const handleExportCurrentPreset = () => {
    const payload = buildPresetPayload();
    const exportData: AppPresetFile = {
      name: payload.name,
      defaultTitle: payload.title,
      defaultSubtitle: payload.subtitle,
      settings: payload.settings,
      slides: payload.slides,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = (payload.name || 'preset').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    link.download = `${safeName || 'preset'}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(`Downloaded ${payload.name}.json`);
  };

  // ── JSON IMPORT ──────────────────────────────────────────────────────────
  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setJsonImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        // Support both a single preset object and an array of presets
        const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
        const valid = items.filter(validatePresetFile) as AppPresetFile[];
        if (valid.length === 0) {
          setJsonImportError('Invalid preset JSON. Make sure it has name, defaultTitle, defaultSubtitle, and settings.');
          return;
        }
        const converted = valid.map(jsonFileToPreset);
        setAppPresets((prev) => [...prev, ...converted]);
        // Auto-select the first imported preset
        setSelectedPresetId(converted[0].id);

        // Also apply it to all current screenshots immediately if they exist
        if (hasSlides) {
          const newPreset = converted[0];
          setSettings((prev) => ({ ...prev, ...newPreset.settings }));
          setScreenshots((prev) =>
            prev.map((slide, i) => {
              const slideData = newPreset.slides?.find((s) => s.index === i) ??
                newPreset.slides?.[i];
              return {
                ...slide,
                title: slideData?.title ?? newPreset.title ?? slide.title,
                subtitle: slideData?.subtitle ?? newPreset.subtitle ?? slide.subtitle,
                // Keep the drag offsets so user doesn't lose their positioning
                settingsOverrides: slideData?.settingsOverrides
                  ? { ...newPreset.settings, ...slideData.settingsOverrides }
                  : undefined,
              };
            })
          );
        }
      } catch {
        setJsonImportError('Could not parse JSON file. Please check for syntax errors.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── JSON EXPORT ──────────────────────────────────────────────────────────
  const handleExportProject = () => {
    const project: LocalProject = {
      name: projectName.trim() || 'Untitled project',
      settings,
      screenshots,
      activeIndex,
      updatedAt: Date.now(),
      brandKit,
      activeLocale,
      versions,
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'frameflow-project'}.frameflow.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Project file exported');
  };

  const handleProjectImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const project = JSON.parse(String(reader.result)) as Partial<LocalProject>;
        if (!project.settings || !Array.isArray(project.screenshots)) throw new Error('Invalid project file');
        setProjectName(project.name || file.name.replace(/\.frameflow\.json$|\.json$/i, ''));
        setBrandKit(project.brandKit ?? brandKit);
        setActiveLocale(project.activeLocale ?? 'en-US');
        setVersions(project.versions ?? []);
        setSettings({ ...DEFAULT_SETTINGS, ...project.settings });
        setScreenshots(project.screenshots);
        setActiveIndex(Math.max(0, Math.min(project.activeIndex ?? 0, Math.max(0, project.screenshots.length - 1))));
        setSelectedSlideIds([]);
        notify('Project imported');
      } catch {
        notify('That is not a valid Frameflow project', 'error');
      }
    };
    reader.onerror = () => notify('Unable to read the project file', 'error');
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleExportPresetsJson = () => {
    const exportData: AppPresetFile[] = appPresets.map((p) => ({
      name: p.name,
      defaultTitle: p.title,
      defaultSubtitle: p.subtitle,
      settings: p.settings,
      slides: p.slides,
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mockup-presets.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files as FileList);
    addImages(files.filter((f) => f.type.startsWith('image/')));
    e.target.value = '';
  };

  const handleScreenshotReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !activeScreenshot) return;
    const file = e.target.files[0];
    try {
      const newUrl = await readFileAsDataUrl(file);
      setScreenshots((prev) => prev.map((s, i) => (i === activeIndex ? { ...s, url: newUrl } : s)));
      notify('Screenshot replaced');
    } catch {
      notify('Unable to read that image', 'error');
    }
    e.target.value = '';
  };

  const addImages = async (files: File[]) => {
    if (files.length === 0) return;
    const preset = selectedPreset || DEFAULT_PRESETS[0];
    try {
      const urls = await Promise.all(files.map(readFileAsDataUrl));
      setScreenshots((prev) => {
        const newScreenshots: Screenshot[] = urls.map((url, fileIdx) => {
          const slideIndex = prev.length + fileIdx;
          const slideData = preset.slides?.find((s) => s.index === slideIndex) ?? preset.slides?.[slideIndex];
          return {
            id: makeId(),
            url,
            title: slideData?.title ?? preset.title,
            subtitle: slideData?.subtitle ?? preset.subtitle,
            textOffset: { x: 0, y: 0 },
            deviceOffset: { x: 0, y: 0 },
            settingsOverrides: slideData?.settingsOverrides
              ? { ...preset.settings, ...slideData.settingsOverrides }
              : { ...preset.settings },
          };
        });
        if (prev.length === 0) setActiveIndex(0);
        return [...prev, ...newScreenshots];
      });
      notify(`${files.length} screenshot${files.length === 1 ? '' : 's'} added`);
    } catch {
      notify('One or more images could not be read', 'error');
    }
  };

  const createDemoProject = () => {
    const demoSlides: Screenshot[] = [
      {
        id: makeId(),
        url: createDemoScreen(0),
        title: 'Your work, [accent]beautifully[/accent] organized',
        subtitle: 'Everything you need to move from idea to impact.',
        textOffset: { x: 0, y: 0 },
        deviceOffset: { x: 0, y: 0 },
        settingsOverrides: { ...selectedPreset.settings },
      },
      {
        id: makeId(),
        url: createDemoScreen(1),
        title: 'See the signal, [accent]not the noise[/accent]',
        subtitle: 'Clear insights that help your team make better decisions.',
        textOffset: { x: 0, y: 0 },
        deviceOffset: { x: 0, y: 0 },
        settingsOverrides: { ...selectedPreset.settings },
      },
      {
        id: makeId(),
        url: createDemoScreen(2),
        title: 'Move faster with [accent]one workspace[/accent]',
        subtitle: 'Plan, collaborate, and ship from anywhere.',
        textOffset: { x: 0, y: 0 },
        deviceOffset: { x: 0, y: 0 },
        settingsOverrides: { ...selectedPreset.settings },
      },
    ];
    setScreenshots(demoSlides);
    setActiveIndex(0);
  };

  const clearProject = () => {
    setScreenshots([]);
    setActiveIndex(0);
    setSelectedSlideIds([]);
    setSelectedLayer(null);
    setConfirmClearOpen(false);
    notify('Project cleared');
  };

  const removeScreenshot = (id: string) => {
    setSelectedSlideIds((current) => current.filter((slideId) => slideId !== id));
    setScreenshots((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (activeIndex >= filtered.length) {
        setActiveIndex(Math.max(0, filtered.length - 1));
      }
      return filtered;
    });
  };

  const duplicateScreenshot = () => {
    const active = screenshots[activeIndex];
    if (!active) return;
    const duplicated: Screenshot = {
      ...active,
      id: makeId(),
      textOffset: { ...active.textOffset },
      deviceOffset: { ...active.deviceOffset },
      settingsOverrides: active.settingsOverrides ? { ...active.settingsOverrides } : undefined,
    };
    setScreenshots((prev) => {
      const newArr = [...prev];
      newArr.splice(activeIndex + 1, 0, duplicated);
      return newArr;
    });
    setActiveIndex(activeIndex + 1);
  };

  const toggleSlideSelection = (id: string) => {
    setSelectedSlideIds((current) => current.includes(id)
      ? current.filter((slideId) => slideId !== id)
      : [...current, id]);
  };

  const applyStyleToSelectedSlides = () => {
    if (selectedSlideIds.length === 0) return;
    setScreenshots((current) => current.map((slide) => selectedSlideIds.includes(slide.id)
      ? { ...slide, settingsOverrides: { ...activeSettings } }
      : slide));
    notify(`Style applied to ${selectedSlideIds.length} selected slide${selectedSlideIds.length === 1 ? '' : 's'}`);
  };

  const duplicateSelectedSlides = () => {
    if (selectedSlideIds.length === 0) return;
    const selected = screenshots.filter((slide) => selectedSlideIds.includes(slide.id));
    const duplicates = selected.map((slide) => ({
      ...slide,
      id: makeId(),
      textOffset: { ...slide.textOffset },
      deviceOffset: { ...slide.deviceOffset },
      settingsOverrides: slide.settingsOverrides ? { ...slide.settingsOverrides } : undefined,
      translations: slide.translations ? { ...slide.translations } : undefined,
    }));
    setScreenshots((current) => [...current, ...duplicates]);
    setSelectedSlideIds(duplicates.map((slide) => slide.id));
    notify(`${duplicates.length} slide${duplicates.length === 1 ? '' : 's'} duplicated`);
  };

  const removeSelectedSlides = () => {
    if (selectedSlideIds.length === 0) return;
    setScreenshots((current) => current.filter((slide) => !selectedSlideIds.includes(slide.id)));
    setSelectedSlideIds([]);
    setActiveIndex(0);
    notify('Selected slides removed');
  };

  const applyBrandKit = () => {
    updateSetting({
      accentColor: brandKit.primary,
      titleColor: brandKit.secondary,
      titleFontFamily: brandKit.fontFamily,
      subtitleFontFamily: brandKit.fontFamily,
    });
    notify(`${brandKit.name || 'Brand'} styles applied`);
  };

  const updateCurrentCopy = (field: 'title' | 'subtitle', value: string) => {
    if (!activeScreenshot) return;
    if (activeLocale === 'en-US') {
      updateCurrentScreenshot({ [field]: value });
      return;
    }
    const currentCopy = activeScreenshot.translations?.[activeLocale] ?? {
      title: activeScreenshot.title,
      subtitle: activeScreenshot.subtitle,
    };
    updateCurrentScreenshot({
      translations: {
        ...activeScreenshot.translations,
        [activeLocale]: { ...currentCopy, [field]: value },
      },
    });
  };

  const saveVersion = () => {
    const version: ProjectVersion = {
      id: makeId(),
      name: `Version ${versions.length + 1}`,
      createdAt: Date.now(),
      snapshot: cloneEditorSnapshot(settings, screenshots, activeIndex),
    };
    setVersions((current) => [version, ...current].slice(0, 10));
    notify('Project version saved');
  };

  const restoreVersion = (version: ProjectVersion) => {
    restoreSnapshot(version.snapshot);
    notify(`${version.name} restored`);
  };

  const moveScreenshot = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    const activeId = screenshots[activeIndex]?.id;
    setScreenshots((prev) => {
      const fromIndex = prev.findIndex((slide) => slide.id === draggedId);
      const toIndex = prev.findIndex((slide) => slide.id === targetId);
      if (fromIndex < 0 || toIndex < 0) return prev;

      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      if (activeId) setActiveIndex(next.findIndex((slide) => slide.id === activeId));
      return next;
    });
  };

  const updateCurrentScreenshot = (updates: Partial<Screenshot>) => {
    if (!activeScreenshot) return;
    setScreenshots((prev) => prev.map((s, i) => (i === activeIndex ? { ...s, ...updates } : s)));
  };

  const updateCurrentOffsets = (
    target: 'text' | 'device',
    updater: (prev: Point) => Point
  ) => {
    if (!activeScreenshot) return;
    setScreenshots((prev) =>
      prev.map((s, i) => {
        if (i !== activeIndex) return s;
        if (target === 'text') return { ...s, textOffset: updater(s.textOffset) };
        return { ...s, deviceOffset: updater(s.deviceOffset) };
      })
    );
  };

  const handleStartDrag = (target: 'text' | 'device', e: React.PointerEvent) => {
    if (!dragMode || !activeScreenshot) return;
    e.preventDefault();
    e.stopPropagation();
    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startOffset:
        target === 'text' ? activeScreenshot.textOffset : activeScreenshot.deviceOffset,
      target,
      activeId: activeScreenshot.id,
    };
    setDraggingTarget(target);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const safeScale = Math.max(zoomScale, 0.05);
      const dx = (e.clientX - drag.startX) / safeScale;
      const dy = (e.clientY - drag.startY) / safeScale;
      const clamp = (v: number) => Math.max(-1920, Math.min(1920, v));
      const next = { x: clamp(drag.startOffset.x + dx), y: clamp(drag.startOffset.y + dy) };
      setScreenshots((prev) =>
        prev.map((s, i) => {
          if (i !== activeIndex || s.id !== drag.activeId) return s;
          if (drag.target === 'text') return { ...s, textOffset: next };
          return { ...s, deviceOffset: next };
        })
      );
    };
    const onPointerEnd = (e: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      dragStateRef.current = null;
      setDraggingTarget(null);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerEnd);
    window.addEventListener('pointercancel', onPointerEnd);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerEnd);
      window.removeEventListener('pointercancel', onPointerEnd);
    };
  }, [activeIndex, zoomScale]);

  const resetCurrentPosition = () => {
    setScreenshots((prev) =>
      prev.map((s, i) =>
        i === activeIndex ? { ...s, textOffset: { x: 0, y: 0 }, deviceOffset: { x: 0, y: 0 } } : s
      )
    );
  };

  const nudgeCurrent = (
    target: 'text' | 'device',
    axis: 'x' | 'y',
    delta: number
  ) => {
    updateCurrentOffsets(target, (offset) => ({
      ...offset,
      [axis]: Math.max(-1920, Math.min(1920, offset[axis] + delta)),
    }));
  };

  const restoreSnapshot = useCallback((snapshot: EditorSnapshot) => {
    if (historyTimerRef.current !== null) {
      window.clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
    }
    isRestoringHistoryRef.current = true;
    historyCurrentRef.current = cloneEditorSnapshot(snapshot.settings, snapshot.screenshots, snapshot.activeIndex);
    setSettings({ ...snapshot.settings });
    setScreenshots(snapshot.screenshots.map((slide) => ({
      ...slide,
      textOffset: { ...slide.textOffset },
      deviceOffset: { ...slide.deviceOffset },
      settingsOverrides: slide.settingsOverrides ? { ...slide.settingsOverrides } : undefined,
    })));
    setActiveIndex(Math.max(0, Math.min(snapshot.activeIndex, snapshot.screenshots.length - 1)));
    setHasPendingHistory(false);
  }, []);

  const undo = useCallback(() => {
    const current = cloneEditorSnapshot(settings, screenshots, activeIndex);
    const pendingTarget = historyCurrentRef.current;

    if (hasPendingHistory && pendingTarget && !snapshotsMatch(pendingTarget, current)) {
      setHistory((state) => ({
        past: state.past,
        future: [current, ...state.future].slice(0, 50),
      }));
      restoreSnapshot(pendingTarget);
      return;
    }

    const target = history.past[history.past.length - 1];
    if (!target) return;
    setHistory((state) => ({
      past: state.past.slice(0, -1),
      future: [current, ...state.future].slice(0, 50),
    }));
    restoreSnapshot(target);
  }, [activeIndex, hasPendingHistory, history.past, restoreSnapshot, screenshots, settings]);

  const redo = useCallback(() => {
    if (hasPendingHistory) return;
    const target = history.future[0];
    if (!target) return;
    const current = cloneEditorSnapshot(settings, screenshots, activeIndex);
    setHistory((state) => ({
      past: [...state.past, current].slice(-50),
      future: state.future.slice(1),
    }));
    restoreSnapshot(target);
  }, [activeIndex, hasPendingHistory, history.future, restoreSnapshot, screenshots, settings]);

  useEffect(() => {
    const handleHistoryShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isTyping || !(event.metaKey || event.ctrlKey)) return;

      if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((event.key.toLowerCase() === 'z' && event.shiftKey) || event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleHistoryShortcut);
    return () => window.removeEventListener('keydown', handleHistoryShortcut);
  }, [redo, undo]);

  useEffect(() => {
    const handleEditorShortcuts = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT' || target?.isContentEditable;
      if (isTyping || !activeScreenshot) return;

      if (event.key === 'Escape') {
        setSelectedLayer(null);
        return;
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedLayer) {
        event.preventDefault();
        updateCurrentScreenshot(selectedLayer === 'text' ? { textVisible: false } : { deviceVisible: false });
        notify(`${selectedLayer === 'text' ? 'Text' : 'Device'} layer hidden`);
        return;
      }

      if (event.key.startsWith('Arrow') && selectedLayer) {
        event.preventDefault();
        const amount = event.shiftKey ? 10 : 1;
        if (event.key === 'ArrowLeft') nudgeCurrent(selectedLayer, 'x', -amount);
        if (event.key === 'ArrowRight') nudgeCurrent(selectedLayer, 'x', amount);
        if (event.key === 'ArrowUp') nudgeCurrent(selectedLayer, 'y', -amount);
        if (event.key === 'ArrowDown') nudgeCurrent(selectedLayer, 'y', amount);
      }
    };
    window.addEventListener('keydown', handleEditorShortcuts);
    return () => window.removeEventListener('keydown', handleEditorShortcuts);
  }, [activeScreenshot, notify, selectedLayer]);

  const buildExportFilename = (slide: Screenshot, index: number, slideSettings: Settings) => {
    const extension = exportFormat === 'jpeg' ? 'jpg' : exportFormat;
    const name = filenamePattern
      .replaceAll('{project}', projectName)
      .replaceAll('{locale}', activeLocale)
      .replaceAll('{index}', String(index + 1).padStart(2, '0'))
      .replaceAll('{width}', String(slideSettings.canvasWidth * exportScale))
      .replaceAll('{height}', String(slideSettings.canvasHeight * exportScale))
      .replaceAll('{title}', slide.title.replace(/\[\/?accent\]/g, ''));
    return `${sanitizeFilename(name)}.${extension}`;
  };

  const renderSlideForExport = async (slide: Screenshot) => {
    const node = document.getElementById(`export-${slide.id}`);
    if (!node) throw new Error('Export node not found');
    const slideSettings = { ...settings, ...slide.settingsOverrides };
    const previousBackground = node.style.background;
    const bgPatternNode = node.querySelector('.mockup-bg-pattern') as HTMLElement | null;
    const prevBgPatternDisplay = bgPatternNode?.style.display;
    if (transparentExport && exportFormat === 'png') {
      node.style.background = 'transparent';
      if (bgPatternNode) bgPatternNode.style.display = 'none';
    }
    try {
      const pngUrl = await toPng(node, {
        width: slideSettings.canvasWidth,
        height: slideSettings.canvasHeight,
        pixelRatio: exportScale,
      });
      if (exportFormat === 'png') return { dataUrl: pngUrl, slideSettings };
      return {
        dataUrl: await convertImageDataUrl(pngUrl, exportFormat, exportQuality),
        slideSettings,
      };
    } finally {
      node.style.background = previousBackground;
      if (bgPatternNode && prevBgPatternDisplay !== undefined) {
        bgPatternNode.style.display = prevBgPatternDisplay;
      }
    }
  };

  const downloadDataUrl = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  };

  const exportCurrent = async () => {
    if (!activeScreenshot) return;
    setIsExporting(true);
    try {
      const { dataUrl, slideSettings } = await renderSlideForExport(activeScreenshot);
      downloadDataUrl(dataUrl, buildExportFilename(activeScreenshot, activeIndex, slideSettings));
      notify(`Slide ${activeIndex + 1} exported as ${exportFormat.toUpperCase()}`);
    } catch (err) {
      console.error('Export failed', err);
      notify('Export failed. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const exportZip = async (selectedOnly = false) => {
    const exportSlides = selectedOnly
      ? screenshots.filter((slide) => selectedSlideIds.includes(slide.id))
      : screenshots;
    if (exportSlides.length === 0) return;
    setIsExporting(true);
    try {
      const zip = new JSZip();
      for (const slide of exportSlides) {
        const index = screenshots.findIndex((item) => item.id === slide.id);
        const { dataUrl, slideSettings } = await renderSlideForExport(slide);
        const base64Data = dataUrl.split(',')[1];
        const platform = CANVAS_PRESETS.find((preset) => preset.width === slideSettings.canvasWidth && preset.height === slideSettings.canvasHeight)?.id ?? 'custom';
        zip.file(`${platform}/${activeLocale}/${buildExportFilename(slide, index, slideSettings)}`, base64Data, { base64: true });
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      zip.file('export-summary.json', JSON.stringify({
        project: projectName,
        locale: activeLocale,
        format: exportFormat,
        scale: exportScale,
        slides: exportSlides.length,
        exportedAt: new Date().toISOString(),
      }, null, 2));
      const zipContent = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.download = `${sanitizeFilename(projectName)}-${activeLocale}.zip`;
      link.href = URL.createObjectURL(zipContent);
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      notify(`${exportSlides.length} slide${exportSlides.length === 1 ? '' : 's'} packaged as ZIP`);
    } catch (err) {
      console.error('Zip Export failed', err);
      notify('ZIP export failed. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const exportAll = async () => {
    if (screenshots.length === 0) return;
    setIsExporting(true);
    try {
      for (let i = 0; i < screenshots.length; i++) {
        const slide = screenshots[i];
        const { dataUrl, slideSettings } = await renderSlideForExport(slide);
        downloadDataUrl(dataUrl, buildExportFilename(slide, i, slideSettings));
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
      notify(`${screenshots.length} ${exportFormat.toUpperCase()} files exported`);
    } catch (err) {
      console.error('Export failed', err);
      notify('Export failed. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="app-shell flex h-dvh min-w-0 bg-slate-100 font-sans text-slate-900">
      {/* ── LEFT CONTROL RAIL ── */}
      {showLeftPanel && (
        <aside className="flex w-[300px] shrink-0 flex-col border-r border-slate-200 bg-slate-50/95 xl:w-[320px] 2xl:w-[360px]">
          <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200">
                  <MonitorSmartphone size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-extrabold tracking-tight text-slate-950">Frameflow</h1>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-600">Studio</span>
                  </div>
                  <p className="text-[11px] text-slate-500">App-store mockups, without the busywork</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Saved
              </span>
            </div>

            <nav className="mt-4 grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1" aria-label="Editor tools">
              {[
                { key: 'presets' as const, label: 'Presets', icon: Save },
                { key: 'layout' as const, label: 'Canvas', icon: Layout },
                { key: 'device' as const, label: 'Device', icon: Smartphone },
                { key: 'typography' as const, label: 'Type', icon: Type },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => focusSection(key)}
                  className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] font-semibold transition-all ${activeTool === key
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
                    }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {/* Editing scope */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div>
                <p className="text-xs font-bold text-slate-800">Editing scope</p>
                <p className={`mt-0.5 text-[11px] font-medium ${applyToAll ? 'text-indigo-600' : 'text-amber-600'}`}>
                  {applyToAll ? 'All slides' : `Slide ${activeIndex + 1} only`}
                </p>
              </div>
              <button
                onClick={() => setApplyToAll((value) => !value)}
                aria-pressed={applyToAll}
                className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${applyToAll ? 'bg-indigo-600' : 'bg-amber-400'}`}
                title="Toggle whether changes apply to every slide"
              >
                <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${applyToAll ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Brand Presets */}
            <PanelSection
              id="section-presets"
              title="Brand Presets"
              description="Switching preset instantly previews that look. Import a JSON file to load a per-app preset."
              open={openSections.presets}
              onToggle={() => toggleSection('presets')}
            >
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Project name</label>
                <input
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  className="mt-1 w-full bg-transparent text-sm font-bold text-slate-800 outline-none"
                  placeholder="Untitled project"
                />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                    <Upload size={13} /> Import project
                    <input type="file" accept=".json,.frameflow.json,application/json" className="hidden" onChange={handleProjectImport} />
                  </label>
                  <button type="button" onClick={handleExportProject} className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-2 py-2 text-xs font-bold text-white hover:bg-indigo-600">
                    <FileDown size={13} /> Export project
                  </button>
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-slate-400">Autosaved locally. Project files include slides, images, and settings.</p>
              </div>

              <details className="group rounded-xl border border-slate-200 bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-2"><ShieldCheck size={14} className="text-indigo-500" /> Project tools</span>
                  <ChevronRight size={14} className="transition-transform group-open:rotate-90" />
                </summary>
                <div className="space-y-4 border-t border-slate-100 p-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700"><Palette size={14} /> Brand kit</div>
                    <input value={brandKit.name} onChange={(event) => setBrandKit((current) => ({ ...current, name: event.target.value }))} className="mt-2 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold outline-none focus:border-indigo-400" aria-label="Brand name" />
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-[10px] font-bold text-slate-500"><input type="color" value={brandKit.primary} onChange={(event) => setBrandKit((current) => ({ ...current, primary: event.target.value }))} className="h-6 w-6" /> Accent</label>
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-[10px] font-bold text-slate-500"><input type="color" value={brandKit.secondary} onChange={(event) => setBrandKit((current) => ({ ...current, secondary: event.target.value }))} className="h-6 w-6" /> Text</label>
                    </div>
                    <select value={brandKit.fontFamily} onChange={(event) => setBrandKit((current) => ({ ...current, fontFamily: event.target.value }))} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold">
                      {FONT_OPTIONS.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
                    </select>
                    <button type="button" onClick={applyBrandKit} className="mt-2 w-full rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100">Apply brand to editing scope</button>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-bold text-slate-700"><Library size={14} /> Media library</span><span className="text-[10px] font-semibold text-slate-400">{mediaLibrary.length} assets</span></div>
                    {mediaLibrary.length > 0 ? (
                      <div className="mt-2 grid grid-cols-5 gap-1.5">
                        {mediaLibrary.slice(0, 10).map((asset) => <button key={asset.url} type="button" onClick={() => updateCurrentScreenshot({ url: asset.url })} className="aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 hover:ring-2 hover:ring-indigo-300" title="Use this image"><img src={asset.url} alt="Reusable project asset" className="h-full w-full object-cover" /></button>)}
                      </div>
                    ) : <p className="mt-2 text-[11px] text-slate-400">Uploaded screenshots appear here for quick reuse.</p>}
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700"><Languages size={14} /> Localization</div>
                    <select value={activeLocale} onChange={(event) => setActiveLocale(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold">
                      <option value="en-US">English (source)</option><option value="fr-FR">French</option><option value="de-DE">German</option><option value="es-ES">Spanish</option><option value="pt-BR">Portuguese (Brazil)</option><option value="ja-JP">Japanese</option><option value="ko-KR">Korean</option>
                    </select>
                    <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">Switch locale, then edit copy in the inspector. Source copy is used until a translation changes.</p>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-bold text-slate-700"><History size={14} /> Versions</span><button type="button" onClick={saveVersion} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-200">Save version</button></div>
                    {versions.length > 0 ? <div className="mt-2 space-y-1.5">{versions.slice(0, 4).map((version) => <button type="button" key={version.id} onClick={() => restoreVersion(version)} className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-2.5 py-2 text-left hover:bg-slate-50"><span className="text-[11px] font-bold text-slate-600">{version.name}</span><span className="text-[9px] text-slate-400">{new Date(version.createdAt).toLocaleDateString()}</span></button>)}</div> : <p className="mt-2 text-[11px] text-slate-400">Save a checkpoint before a major edit.</p>}
                  </div>
                </div>
              </details>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Preset</label>
                <select
                  value={selectedPreset.id}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  {appPresets.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <p className="text-xs text-indigo-600 font-medium">↑ Switching preset instantly applies its look to the canvas.</p>
              </div>

              {/* JSON import / export row */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preset Files (.json)</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-indigo-300 bg-indigo-50 text-indigo-700 text-xs font-semibold cursor-pointer hover:bg-indigo-100 transition-colors">
                    <Upload size={14} /> Import JSON
                    <input
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={handleJsonImport}
                    />
                  </label>
                  <button
                    onClick={handleExportCurrentPreset}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-indigo-200 bg-white text-indigo-700 text-xs font-semibold hover:bg-indigo-50 transition-colors shadow-2xs"
                    title="Download the active preset as a standalone .json file"
                  >
                    <FileDown size={14} /> Export Preset
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleExportPresetsJson}
                    className="text-[10px] text-slate-500 hover:text-indigo-600 underline transition-colors"
                    title="Export all presets as a single bundle file"
                  >
                    Export all presets bundle
                  </button>
                </div>
                {jsonImportError && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{jsonImportError}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preset Name</label>
                <input
                  value={presetDraft.name}
                  onChange={(e) => setPresetDraft((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="e.g. Fitness App Launch"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Default Title</label>
                <textarea
                  value={presetDraft.title}
                  onChange={(e) => setPresetDraft((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                  rows={2}
                  placeholder="Headline (supports [accent]word[/accent])"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Default Subtitle</label>
                <textarea
                  value={presetDraft.subtitle}
                  onChange={(e) => setPresetDraft((prev) => ({ ...prev, subtitle: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                  rows={2}
                  placeholder="Supporting description copy"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={savePresetChanges}
                  className="px-3 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  title="Save current canvas settings and copy into this preset"
                >
                  <Check size={14} /> Update Preset
                </button>
                <button
                  onClick={createPreset}
                  className="px-3 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/80 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1.5"
                  title="Save this design as a brand new preset"
                >
                  <Plus size={14} /> Save as New
                </button>
                <button
                  onClick={syncPresetDraftFromCanvas}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  title="Pull title & subtitle from active slide into this draft"
                >
                  Use Slide Copy
                </button>
                <button
                  onClick={deletePreset}
                  disabled={appPresets.length <= 1}
                  className="px-3 py-2 rounded-xl border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <button
                  onClick={() => applyPresetToSlides('current')}
                  disabled={!hasSlides}
                  className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply to Current
                </button>
                <button
                  onClick={() => applyPresetToSlides('all')}
                  disabled={!hasSlides}
                  className="px-3 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply to All Slides
                </button>
              </div>
            </PanelSection>

            {/* Layout */}
            <PanelSection
              id="section-layout"
              title="Canvas & Layout"
              description="Control canvas background, content flow, text and device alignment."
              open={openSections.layout}
              onToggle={() => toggleSection('layout')}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <MonitorSmartphone size={16} className="text-indigo-500" /> Output size
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateSetting({ canvasWidth: activeSettings.canvasHeight, canvasHeight: activeSettings.canvasWidth })}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50"
                      title="Swap canvas orientation"
                    >
                      Rotate
                    </button>
                    <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-500">
                      {activeSettings.canvasWidth} × {activeSettings.canvasHeight}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {CANVAS_PRESETS.map((preset) => {
                    const selected = activeSettings.canvasWidth === preset.width && activeSettings.canvasHeight === preset.height;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => updateSetting({ canvasWidth: preset.width, canvasHeight: preset.height })}
                        className={`rounded-xl border px-3 py-2.5 text-left transition-all ${selected
                          ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-100'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                      >
                        <span className={`block text-xs font-bold ${selected ? 'text-indigo-700' : 'text-slate-700'}`}>{preset.label}</span>
                        <span className="mt-0.5 block font-mono text-[10px] text-slate-400">{preset.width} × {preset.height}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Width</span>
                    <input
                      type="number"
                      min={320}
                      max={4096}
                      value={activeSettings.canvasWidth}
                      onChange={(e) => updateSetting({ canvasWidth: Math.max(320, Number(e.target.value)) })}
                      className="mt-1 w-full bg-transparent text-sm font-semibold text-slate-700 outline-none"
                    />
                  </label>
                  <label className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Height</span>
                    <input
                      type="number"
                      min={320}
                      max={4096}
                      value={activeSettings.canvasHeight}
                      onChange={(e) => updateSetting({ canvasHeight: Math.max(320, Number(e.target.value)) })}
                      className="mt-1 w-full bg-transparent text-sm font-semibold text-slate-700 outline-none"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Palette size={16} className="text-indigo-500" /> Background
                  </label>
                  {(() => {
                    const activePatternId =
                      activeSettings.backgroundPattern === 'wave-ribbons'
                        ? 'emerald-wave'
                        : activeSettings.backgroundPattern ||
                        (typeof activeSettings.background === 'string' && activeSettings.background.includes('#057a44') ? 'emerald-wave' : 'none');
                    return activePatternId !== 'none' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200 shadow-2xs">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: activeSettings.backgroundPatternColor || '#078249' }} />
                        {DESIGNER_PATTERNS.find(p => p.id === activePatternId)?.name || 'Pattern'} Active
                      </span>
                    ) : null;
                  })()}
                </div>

                {/* Designer Background Pattern Selector */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Designer Patterns
                    </span>
                    <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                      {DESIGNER_PATTERNS.length - 1} Pro Styles
                    </span>
                  </div>

                  {(() => {
                    const activePatternId =
                      activeSettings.backgroundPattern === 'wave-ribbons'
                        ? 'emerald-wave'
                        : activeSettings.backgroundPattern ||
                        (typeof activeSettings.background === 'string' && activeSettings.background.includes('#057a44') ? 'emerald-wave' : 'none');
                    const isAnyPatternActive = activePatternId !== 'none';

                    return (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          {DESIGNER_PATTERNS.map((pat) => {
                            const isSelected = activePatternId === pat.id;
                            return (
                              <button
                                key={pat.id}
                                type="button"
                                onClick={() => {
                                  if (pat.id === 'none') {
                                    updateSetting({ backgroundPattern: 'none' });
                                  } else {
                                    const baseColor = activeSettings.backgroundPatternColor || '#078249';
                                    const cornerStart = activeSettings.backgroundPatternCornerStart || '#10b981';
                                    const cornerEnd = activeSettings.backgroundPatternCornerEnd || '#02381e';
                                    const waveColor = activeSettings.backgroundPatternWaveColor || '#34d399';
                                    const tones = computePatternTones(baseColor, cornerStart, cornerEnd, waveColor);
                                    updateSetting({
                                      backgroundPattern: pat.id,
                                      backgroundPatternColor: baseColor,
                                      backgroundPatternCornerStart: cornerStart,
                                      backgroundPatternCornerEnd: cornerEnd,
                                      backgroundPatternWaveColor: waveColor,
                                      background: `linear-gradient(160deg, ${tones.baseGrad0} 0%, ${tones.baseGrad30} 45%, ${tones.baseGrad100} 100%)`,
                                      titleColor: '#FFFFFF',
                                      subtitleColor: tones.subtitleColor,
                                      accentColor: tones.accentColor,
                                    });
                                  }
                                }}
                                className={`relative overflow-hidden rounded-xl border p-2 text-left transition-all ${isSelected
                                  ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-sm'
                                  : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'
                                  }`}
                              >
                                <div
                                  className="relative h-14 w-full rounded-lg overflow-hidden mb-1.5 shadow-inner border border-slate-200/60"
                                  style={{
                                    backgroundColor:
                                      pat.id === 'none'
                                        ? undefined
                                        : activeSettings.backgroundPatternColor || '#078249',
                                    background:
                                      pat.id === 'none'
                                        ? isSelected
                                          ? activeSettings.background
                                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                        : undefined,
                                  }}
                                >
                                  {pat.id === 'emerald-wave' && (
                                    <EmeraldWaveBackground
                                      idPrefix="thumb-wave"
                                      baseColor={activeSettings.backgroundPatternColor || '#078249'}
                                      cornerStart={activeSettings.backgroundPatternCornerStart}
                                      cornerEnd={activeSettings.backgroundPatternCornerEnd}
                                      waveColor={activeSettings.backgroundPatternWaveColor}
                                    />
                                  )}
                                  {pat.id === 'aurora-mesh' && (
                                    <AuroraMeshBackground
                                      idPrefix="thumb-aurora"
                                      baseColor={activeSettings.backgroundPatternColor || '#078249'}
                                      cornerStart={activeSettings.backgroundPatternCornerStart}
                                      cornerEnd={activeSettings.backgroundPatternCornerEnd}
                                      waveColor={activeSettings.backgroundPatternWaveColor}
                                    />
                                  )}
                                  {pat.id === 'cyber-grid' && (
                                    <CyberGridBackground
                                      idPrefix="thumb-grid"
                                      baseColor={activeSettings.backgroundPatternColor || '#078249'}
                                      cornerStart={activeSettings.backgroundPatternCornerStart}
                                      cornerEnd={activeSettings.backgroundPatternCornerEnd}
                                      waveColor={activeSettings.backgroundPatternWaveColor}
                                    />
                                  )}
                                  {pat.id === 'glass-spheres' && (
                                    <GlassSpheresBackground
                                      idPrefix="thumb-spheres"
                                      baseColor={activeSettings.backgroundPatternColor || '#078249'}
                                      cornerStart={activeSettings.backgroundPatternCornerStart}
                                      cornerEnd={activeSettings.backgroundPatternCornerEnd}
                                      waveColor={activeSettings.backgroundPatternWaveColor}
                                    />
                                  )}
                                  {pat.id === 'topography-contour' && (
                                    <TopographyBackground
                                      idPrefix="thumb-topo"
                                      baseColor={activeSettings.backgroundPatternColor || '#078249'}
                                      cornerStart={activeSettings.backgroundPatternCornerStart}
                                      cornerEnd={activeSettings.backgroundPatternCornerEnd}
                                      waveColor={activeSettings.backgroundPatternWaveColor}
                                    />
                                  )}
                                  {pat.id === 'crystal-prism' && (
                                    <CrystalPrismBackground
                                      idPrefix="thumb-prism"
                                      baseColor={activeSettings.backgroundPatternColor || '#078249'}
                                      cornerStart={activeSettings.backgroundPatternCornerStart}
                                      cornerEnd={activeSettings.backgroundPatternCornerEnd}
                                      waveColor={activeSettings.backgroundPatternWaveColor}
                                    />
                                  )}
                                  <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[8px] font-bold text-white uppercase tracking-wider backdrop-blur-xs">
                                    {pat.badge}
                                  </span>
                                </div>
                                <span className="block text-xs font-bold text-slate-800 leading-tight">{pat.name}</span>
                                <span className="block text-[10px] text-slate-500 leading-tight truncate">{pat.desc}</span>
                              </button>
                            );
                          })}
                        </div>

                        {isAnyPatternActive && (
                          <div className="pt-3 border-t border-slate-200/80 space-y-3">
                            {/* 1. Duo-Tone & Multi-Color Presets */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                  Designer Duo-Tone Palettes
                                </span>
                                <span className="text-[10px] text-slate-400">Pre-harmonized</span>
                              </div>

                              <div className="grid grid-cols-4 gap-1.5">
                                {DESIGNER_PATTERN_PRESETS.map((p) => {
                                  const isCurrent =
                                    (activeSettings.backgroundPatternColor || '#078249').toLowerCase() === p.base.toLowerCase() &&
                                    (activeSettings.backgroundPatternCornerStart || '').toLowerCase() === p.cornerStart.toLowerCase();
                                  return (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => {
                                        const tones = computePatternTones(p.base, p.cornerStart, p.cornerEnd, p.wave);
                                        updateSetting({
                                          backgroundPatternColor: p.base,
                                          backgroundPatternCornerStart: p.cornerStart,
                                          backgroundPatternCornerEnd: p.cornerEnd,
                                          backgroundPatternWaveColor: p.wave,
                                          background: `linear-gradient(160deg, ${tones.baseGrad0} 0%, ${tones.baseGrad30} 45%, ${tones.baseGrad100} 100%)`,
                                          titleColor: '#FFFFFF',
                                          subtitleColor: tones.subtitleColor,
                                          accentColor: tones.accentColor,
                                        });
                                      }}
                                      className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-left transition-all ${isCurrent
                                        ? 'border-slate-800 bg-white shadow-xs ring-1 ring-slate-800'
                                        : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300'
                                        }`}
                                      title={`${p.name} (${p.badge})`}
                                    >
                                      <span className="relative w-4 h-4 rounded-full flex-shrink-0 overflow-hidden shadow-2xs border border-black/10">
                                        <span className="absolute inset-0 w-1/2" style={{ backgroundColor: p.cornerStart }} />
                                        <span className="absolute inset-0 left-1/2 w-1/2" style={{ backgroundColor: p.base }} />
                                        <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white" style={{ backgroundColor: p.wave }} />
                                      </span>
                                      <span className="text-[10px] font-semibold text-slate-700 truncate">{p.name}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* 2. Direct Corner & Wave Gradient Customizer */}
                            <div className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-2.5 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                                  Corner & Wave Gradient Colors
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const base = activeSettings.backgroundPatternColor || '#009e52';
                                    const tones = computePatternTones(base);
                                    updateSetting({
                                      backgroundPatternCornerStart: tones.ribbonTop0,
                                      backgroundPatternCornerEnd: tones.ribbonBottom100,
                                      backgroundPatternWaveColor: tones.waveBody0,
                                      subtitleColor: tones.subtitleColor,
                                      accentColor: tones.accentColor,
                                    });
                                  }}
                                  className="text-[10px] font-semibold text-indigo-600 hover:underline"
                                  title="Recalculate corner gradient colors from the base background"
                                >
                                  Auto-Match Base
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-1.5 hover:bg-slate-50 cursor-pointer">
                                  <input
                                    type="color"
                                    value={activeSettings.backgroundPatternCornerStart || '#05c065'}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      updateSetting({ backgroundPatternCornerStart: val });
                                    }}
                                    className="h-6 w-6 rounded cursor-pointer border-0 bg-transparent p-0 flex-shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-tight">Corner Start</span>
                                    <span className="block text-[11px] font-mono text-slate-700 truncate">
                                      {activeSettings.backgroundPatternCornerStart || '#05c065'}
                                    </span>
                                  </div>
                                </label>

                                <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-1.5 hover:bg-slate-50 cursor-pointer">
                                  <input
                                    type="color"
                                    value={activeSettings.backgroundPatternCornerEnd || '#00783d'}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      updateSetting({ backgroundPatternCornerEnd: val });
                                    }}
                                    className="h-6 w-6 rounded cursor-pointer border-0 bg-transparent p-0 flex-shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-tight">Corner End</span>
                                    <span className="block text-[11px] font-mono text-slate-700 truncate">
                                      {activeSettings.backgroundPatternCornerEnd || '#00783d'}
                                    </span>
                                  </div>
                                </label>

                                <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-1.5 hover:bg-slate-50 cursor-pointer">
                                  <input
                                    type="color"
                                    value={activeSettings.backgroundPatternWaveColor || '#008e49'}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      updateSetting({ backgroundPatternWaveColor: val });
                                    }}
                                    className="h-6 w-6 rounded cursor-pointer border-0 bg-transparent p-0 flex-shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-tight">3D Wave Accent</span>
                                    <span className="block text-[11px] font-mono text-slate-700 truncate">
                                      {activeSettings.backgroundPatternWaveColor || '#008e49'}
                                    </span>
                                  </div>
                                </label>

                                <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-1.5 hover:bg-slate-50 cursor-pointer">
                                  <input
                                    type="color"
                                    value={activeSettings.backgroundPatternColor || '#009e52'}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const tones = computePatternTones(
                                        val,
                                        activeSettings.backgroundPatternCornerStart,
                                        activeSettings.backgroundPatternCornerEnd,
                                        activeSettings.backgroundPatternWaveColor
                                      );
                                      updateSetting({
                                        backgroundPatternColor: val,
                                        background: `linear-gradient(160deg, ${tones.baseGrad0} 0%, ${tones.baseGrad30} 45%, ${tones.baseGrad100} 100%)`,
                                      });
                                    }}
                                    className="h-6 w-6 rounded cursor-pointer border-0 bg-transparent p-0 flex-shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-tight">Base Backdrop</span>
                                    <span className="block text-[11px] font-mono text-slate-700 truncate">
                                      {activeSettings.backgroundPatternColor || '#009e52'}
                                    </span>
                                  </div>
                                </label>
                              </div>
                            </div>

                            <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500">
                              <span>Typography automatically harmonizes to corner accents</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const tones = computePatternTones(
                                    activeSettings.backgroundPatternColor || '#078249',
                                    activeSettings.backgroundPatternCornerStart,
                                    activeSettings.backgroundPatternCornerEnd,
                                    activeSettings.backgroundPatternWaveColor
                                  );
                                  updateSetting({
                                    titleColor: '#FFFFFF',
                                    subtitleColor: tones.subtitleColor,
                                    accentColor: tones.accentColor,
                                  });
                                }}
                                className="font-bold text-indigo-600 hover:underline"
                              >
                                Harmonize text
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-6 gap-2 mb-3">
                  {BACKGROUNDS.map((bg, i) => (
                    <button
                      key={i}
                      onClick={() => updateSetting({
                        background: bg,
                        backgroundPattern: bg.includes('#057a44') ? 'emerald-wave' : 'none',
                      })}
                      className={`w-9 h-9 rounded-full border-2 transition-all hover:scale-110 ${activeSettings.background === bg
                        ? 'border-indigo-600 scale-110 shadow-md'
                        : 'border-transparent shadow-sm'
                        }`}
                      style={{ background: bg }}
                      title={bg}
                    />
                  ))}
                </div>
                <details className="group rounded-xl border border-slate-200 bg-slate-50">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-xs font-bold text-slate-600">
                    Gradient builder
                    <ChevronRight size={14} className="transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="space-y-3 border-t border-slate-200 p-3">
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { label: 'Start', key: 'backgroundGradientStart' as const },
                        { label: 'End', key: 'backgroundGradientEnd' as const },
                      ]).map(({ label, key }) => (
                        <label key={key} className="flex items-center gap-2 rounded-lg bg-white p-2 shadow-sm">
                          <input
                            type="color"
                            value={activeSettings[key]}
                            onChange={(e) => {
                              const next = e.target.value;
                              const start = key === 'backgroundGradientStart' ? next : activeSettings.backgroundGradientStart;
                              const end = key === 'backgroundGradientEnd' ? next : activeSettings.backgroundGradientEnd;
                              updateSetting({ [key]: next, background: `linear-gradient(${activeSettings.backgroundGradientAngle}deg, ${start} 0%, ${end} 100%)` });
                            }}
                            className="h-7 w-7 rounded-md border-0 bg-transparent p-0"
                          />
                          <span className="text-[11px] font-bold text-slate-500">{label}</span>
                        </label>
                      ))}
                    </div>
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Angle · {activeSettings.backgroundGradientAngle}°
                      <input
                        type="range"
                        min={0}
                        max={360}
                        value={activeSettings.backgroundGradientAngle}
                        onChange={(e) => {
                          const angle = Number(e.target.value);
                          updateSetting({
                            backgroundGradientAngle: angle,
                            background: `linear-gradient(${angle}deg, ${activeSettings.backgroundGradientStart} 0%, ${activeSettings.backgroundGradientEnd} 100%)`,
                          });
                        }}
                        className="mt-2 w-full"
                      />
                    </label>
                  </div>
                </details>
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-gray-50 shadow-sm">
                  <span className="text-sm font-medium text-gray-700">Custom</span>
                  <input
                    type="color"
                    value={
                      activeSettings.background.startsWith('#')
                        ? activeSettings.background.slice(0, 7)
                        : '#ffffff'
                    }
                    onChange={(e) => updateSetting({ background: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent flex-shrink-0"
                    title="Solid Color"
                  />
                  <input
                    type="text"
                    placeholder="linear-gradient(...)"
                    value={activeSettings.background}
                    onChange={(e) => updateSetting({ background: e.target.value })}
                    className="flex-1 min-w-0 border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Layout size={16} className="text-indigo-500" /> Layout
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['text-top', 'text-bottom', 'centered'] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() =>
                        updateSetting({
                          layout: l,
                          ...(l === 'text-bottom' && activeSettings.phonePositionMode !== 'half-up'
                            ? { phonePositionMode: 'half-up' }
                            : l === 'text-top' && activeSettings.phonePositionMode === 'half-up'
                              ? { phonePositionMode: 'half-down' }
                              : {}),
                        })
                      }
                      className={`py-2 px-2 rounded-xl text-xs font-medium border transition-colors text-center ${activeSettings.layout === l
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold shadow-2xs'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      {l === 'text-top' ? 'Text Top' : l === 'text-bottom' ? 'Text Bottom' : 'Centered'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Text Align</label>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => {
                        updateSetting({ textAlign: align });
                        if (activeScreenshot)
                          updateCurrentScreenshot({ textOffset: { x: 0, y: activeScreenshot.textOffset.y } });
                      }}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${activeSettings.textAlign === align
                        ? 'bg-white shadow text-indigo-700'
                        : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Smartphone size={16} className="text-indigo-500" /> Phone Position
                  </label>
                  <span className="text-[10px] text-slate-400">Bleed & Alignment</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'half-up' as const, label: 'Top Bleed', desc: 'Device at top (bleeds off top)' },
                    { id: 'centered' as const, label: 'Centered', desc: 'In-frame device' },
                    { id: 'half-down' as const, label: 'Bottom Bleed', desc: 'Device at bottom (bleeds off bottom)' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => updateSetting({ phonePositionMode: mode.id })}
                      className={`py-2 px-2 rounded-xl text-xs font-medium border transition-colors text-center ${activeSettings.phonePositionMode === mode.id
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold shadow-2xs'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      title={mode.desc}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Device Align</label>
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    {(['left', 'center', 'right'] as const).map((align) => (
                      <button
                        key={align}
                        onClick={() => {
                          updateSetting({ deviceAlign: align });
                          if (activeScreenshot)
                            updateCurrentScreenshot({ deviceOffset: { x: 0, y: activeScreenshot.deviceOffset.y } });
                        }}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${activeSettings.deviceAlign === align
                          ? 'bg-white shadow text-indigo-700'
                          : 'text-gray-600 hover:text-gray-900'
                          }`}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Image Fit</label>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  {(['cover', 'contain'] as const).map((fit) => (
                    <button
                      key={fit}
                      onClick={() => updateSetting({ imageFit: fit })}
                      className={`flex-1 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${activeSettings.imageFit === fit
                        ? 'bg-white shadow text-indigo-700'
                        : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                      {fit}
                    </button>
                  ))}
                </div>
              </div>

              <details className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-xs font-bold text-slate-700">
                  Screenshot crop & adjustments
                  <ChevronRight size={14} className="transition-transform group-open:rotate-90" />
                </summary>
                <div className="space-y-4 border-t border-slate-200 p-3">
                  {([
                    { label: 'Zoom', key: 'screenshotScale' as const, min: 50, max: 200, suffix: '%' },
                    { label: 'Horizontal', key: 'screenshotOffsetX' as const, min: -300, max: 300, suffix: 'px' },
                    { label: 'Vertical', key: 'screenshotOffsetY' as const, min: -300, max: 300, suffix: 'px' },
                    { label: 'Rotation', key: 'screenshotRotation' as const, min: -180, max: 180, suffix: '°' },
                    { label: 'Brightness', key: 'screenshotBrightness' as const, min: 25, max: 175, suffix: '%' },
                    { label: 'Contrast', key: 'screenshotContrast' as const, min: 25, max: 175, suffix: '%' },
                    { label: 'Saturation', key: 'screenshotSaturation' as const, min: 0, max: 200, suffix: '%' },
                  ]).map(({ label, key, min, max, suffix }) => (
                    <label key={key} className="block">
                      <span className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        {label}<span className="font-mono text-slate-600">{activeSettings[key]}{suffix}</span>
                      </span>
                      <input type="range" min={min} max={max} value={activeSettings[key]} onChange={(e) => updateSetting({ [key]: Number(e.target.value) })} className="mt-2 w-full" />
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={() => updateSetting({ screenshotScale: 100, screenshotOffsetX: 0, screenshotOffsetY: 0, screenshotRotation: 0, screenshotBrightness: 100, screenshotContrast: 100, screenshotSaturation: 100 })}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Reset screenshot
                  </button>
                </div>
              </details>
            </PanelSection>

            {/* Device */}
            <PanelSection
              id="section-device"
              title="Device"
              description="Scale, frame, rotate, tilt, and shadow for modern-looking mockups."
              open={openSections.device}
              onToggle={() => toggleSection('device')}
            >
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Device type</p>
                  <p className="mt-0.5 text-xs text-slate-400">Choose the right presentation frame</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'iphone' as const, label: 'iPhone' },
                    { id: 'android' as const, label: 'Android' },
                    { id: 'tablet' as const, label: 'Tablet' },
                    { id: 'laptop' as const, label: 'Laptop' },
                    { id: 'browser' as const, label: 'Browser' },
                  ]).map((device) => (
                    <button
                      key={device.id}
                      type="button"
                      onClick={() => updateSetting({ deviceType: device.id })}
                      className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition-all ${activeSettings.deviceType === device.id ? 'border-indigo-300 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}
                    >
                      {device.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Orientation</p>
                  <p className="mt-0.5 text-xs text-slate-400">Rotate or mirror the device</p>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                  {(['portrait', 'landscape'] as const).map((orientation) => (
                    <button
                      key={orientation}
                      type="button"
                      onClick={() => updateSetting({ deviceOrientation: orientation })}
                      disabled={activeSettings.deviceType === 'laptop' || activeSettings.deviceType === 'browser'}
                      className={`rounded-lg py-2 text-xs font-bold capitalize transition-all disabled:cursor-not-allowed disabled:opacity-40 ${activeSettings.deviceOrientation === orientation ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
                    >
                      {orientation}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => updateSetting({ deviceFlipX: !activeSettings.deviceFlipX })} className={`rounded-xl border px-3 py-2 text-xs font-bold ${activeSettings.deviceFlipX ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    Flip horizontal
                  </button>
                  <button type="button" onClick={() => updateSetting({ deviceFlipY: !activeSettings.deviceFlipY })} className={`rounded-xl border px-3 py-2 text-xs font-bold ${activeSettings.deviceFlipY ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    Flip vertical
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Quick poses</p>
                    <p className="mt-0.5 text-xs text-slate-400">Professional angles in one click</p>
                  </div>
                  <span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-violet-600">New</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DEVICE_POSES.map((pose, index) => (
                    <button
                      key={pose.name}
                      onClick={() => updateSetting(pose.settings)}
                      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50/50"
                    >
                      <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-slate-100 to-slate-200">
                        <span
                          className="h-8 w-4 rounded-[4px] border-2 border-slate-700 bg-white shadow-sm transition-transform group-hover:scale-105"
                          style={{ transform: `rotate(${[-0, -7, 7, -12][index]}deg)` }}
                        />
                      </span>
                      <span className="text-xs font-bold text-slate-700">{pose.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Frame style</p>
                    <p className="text-xs text-gray-400 mt-0.5">Choose a polished device finish</p>
                  </div>
                  <button
                    onClick={() => updateSetting({ deviceFrame: !activeSettings.deviceFrame })}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${activeSettings.deviceFrame
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'bg-gray-100 text-gray-500'
                      }`}
                  >
                    {activeSettings.deviceFrame ? 'Frame on' : 'Frame off'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DEVICE_FRAMES.map((frame) => {
                    const selected = activeSettings.deviceFrame && activeSettings.deviceFrameStyle === frame.id;
                    return (
                      <button
                        key={frame.id}
                        onClick={() => updateSetting({
                          deviceFrame: true,
                          deviceFrameStyle: frame.id,
                          deviceFrameColor: frame.shell,
                          deviceFrameEdgeColor: frame.edge,
                        })}
                        className={`group relative flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all ${selected
                          ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                          }`}
                      >
                        <span
                          className="relative h-12 w-7 shrink-0 rounded-[8px] p-[3px] shadow-sm"
                          style={{ background: `linear-gradient(145deg, ${frame.edge}, ${frame.shell})` }}
                        >
                          <span className="block h-full w-full rounded-[6px] bg-gradient-to-b from-slate-100 to-slate-300" />
                          {frame.id !== 'minimal' && (
                            <span className="absolute left-1/2 top-1 -translate-x-1/2 h-1 w-2.5 rounded-full" style={{ backgroundColor: frame.island }} />
                          )}
                        </span>
                        <span className={`text-xs font-semibold ${selected ? 'text-indigo-800' : 'text-gray-700'}`}>
                          {frame.name}
                        </span>
                        {selected && (
                          <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white">
                            <Check size={10} strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Frame', key: 'deviceFrameColor' as const },
                    { label: 'Edge', key: 'deviceFrameEdgeColor' as const },
                  ].map(({ label, key }) => (
                    <label key={key} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2.5">
                      <input
                        type="color"
                        value={activeSettings[key]}
                        onChange={(e) => updateSetting({ [key]: e.target.value })}
                        className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                        aria-label={`${label} color`}
                      />
                      <span className="min-w-0">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
                        <span className="block truncate font-mono text-[11px] text-gray-600">{activeSettings[key].toUpperCase()}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Scale ({activeSettings.deviceScale}%)
                </span>
                <input
                  type="range" min={40} max={100}
                  value={activeSettings.deviceScale}
                  onChange={(e) => updateSetting({ deviceScale: Number(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Border ({activeSettings.deviceBorder}px)
                </span>
                <input
                  type="range" min={0} max={40}
                  value={activeSettings.deviceBorder}
                  onChange={(e) => updateSetting({ deviceBorder: Number(e.target.value) })}
                  className="w-full"
                  disabled={!activeSettings.deviceFrame}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Corner curve ({activeSettings.deviceCornerRadius}px)
                  </span>
                  <button
                    onClick={() => updateSetting({ deviceCornerRadius: DEFAULT_SETTINGS.deviceCornerRadius })}
                    className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Reset
                  </button>
                </div>
                <input
                  type="range" min={0} max={120}
                  value={activeSettings.deviceCornerRadius}
                  onChange={(e) => updateSetting({ deviceCornerRadius: Number(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Square</span>
                  <span>Extra round</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Rotation ({activeSettings.deviceRotation}°)
                </span>
                <input
                  type="range" min={-45} max={45}
                  value={activeSettings.deviceRotation}
                  onChange={(e) => updateSetting({ deviceRotation: Number(e.target.value) })}
                  className="w-full"
                />
                <div className="grid grid-cols-5 gap-1.5">
                  {[-45, -20, 0, 20, 45].map((angle) => (
                    <button
                      key={angle}
                      onClick={() => updateSetting({ deviceRotation: angle })}
                      className={`py-2 rounded-xl text-xs font-medium border transition-colors ${activeSettings.deviceRotation === angle
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      {angle}°
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Tilt X ({activeSettings.deviceTiltX}°)
                  </span>
                  <input
                    type="range" min={-20} max={20}
                    value={activeSettings.deviceTiltX}
                    onChange={(e) => updateSetting({ deviceTiltX: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Tilt Y ({activeSettings.deviceTiltY}°)
                  </span>
                  <input
                    type="range" min={-20} max={20}
                    value={activeSettings.deviceTiltY}
                    onChange={(e) => updateSetting({ deviceTiltY: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Shadow ({activeSettings.deviceShadow})
                </span>
                <input
                  type="range" min={0} max={80}
                  value={activeSettings.deviceShadow}
                  onChange={(e) => updateSetting({ deviceShadow: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
            </PanelSection>

            {/* Typography */}
            <PanelSection
              id="section-typography"
              title="Typography"
              description="Tune title and subtitle fonts, sizes, weights, and colors."
              open={openSections.typography}
              onToggle={() => toggleSection('typography')}
            >
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Type size={16} className="text-indigo-500" /> Colors
                </label>
                {[
                  { label: 'Title', key: 'titleColor' as const },
                  { label: 'Accent', key: 'accentColor' as const },
                  { label: 'Subtitle', key: 'subtitleColor' as const },
                ].map(({ label, key }) => (
                  <div key={key} className="flex items-center justify-between p-3 border border-gray-200 rounded-xl bg-gray-50">
                    <span className="text-sm font-medium text-gray-700">{label} Color</span>
                    <input
                      type="color"
                      value={activeSettings[key] as string}
                      onChange={(e) => updateSetting({ [key]: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-4 pt-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Type size={16} className="text-indigo-500" /> Fonts
                </label>
                {[
                  { label: 'Title Font', key: 'titleFontFamily' as const },
                  { label: 'Subtitle Font', key: 'subtitleFontFamily' as const },
                ].map(({ label, key }) => (
                  <div key={key} className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
                    <select
                      value={activeSettings[key] as string}
                      onChange={(e) => updateSetting({ [key]: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={`${key}-${f.value}`} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                ))}

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Title Size ({activeSettings.titleFontSize}px)
                  </span>
                  <input
                    type="range" min={32} max={160}
                    value={activeSettings.titleFontSize}
                    onChange={(e) => updateSetting({ titleFontSize: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Subtitle Size ({activeSettings.subtitleFontSize}px)
                  </span>
                  <input
                    type="range" min={16} max={80}
                    value={activeSettings.subtitleFontSize}
                    onChange={(e) => updateSetting({ subtitleFontSize: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Text Spacing ({activeSettings.textSpacing}px)
                  </span>
                  <input
                    type="range" min={0} max={120}
                    value={activeSettings.textSpacing}
                    onChange={(e) => updateSetting({ textSpacing: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <details className="group rounded-xl border border-slate-200 bg-slate-50">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-xs font-bold text-slate-700">
                    Advanced spacing
                    <ChevronRight size={14} className="transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="space-y-4 border-t border-slate-200 p-3">
                    {([
                      { label: 'Title line height', key: 'titleLineHeight' as const, min: 0.8, max: 2, step: 0.05 },
                      { label: 'Subtitle line height', key: 'subtitleLineHeight' as const, min: 0.8, max: 2, step: 0.05 },
                      { label: 'Title tracking', key: 'titleLetterSpacing' as const, min: -8, max: 20, step: 0.5 },
                      { label: 'Subtitle tracking', key: 'subtitleLetterSpacing' as const, min: -4, max: 20, step: 0.5 },
                    ]).map(({ label, key, min, max, step }) => (
                      <label key={key} className="block">
                        <span className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {label}<span className="font-mono text-slate-600">{activeSettings[key]}</span>
                        </span>
                        <input type="range" min={min} max={max} step={step} value={activeSettings[key]} onChange={(e) => updateSetting({ [key]: Number(e.target.value) })} className="mt-2 w-full" />
                      </label>
                    ))}
                  </div>
                </details>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Title Weight</span>
                    <select
                      value={activeSettings.titleFontWeight}
                      onChange={(e) => updateSetting({ titleFontWeight: Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded-xl p-2.5 text-sm bg-white"
                    >
                      {[500, 600, 700, 800, 900].map((w) => (
                        <option key={`tw-${w}`} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subtitle Weight</span>
                    <select
                      value={activeSettings.subtitleFontWeight}
                      onChange={(e) => updateSetting({ subtitleFontWeight: Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded-xl p-2.5 text-sm bg-white"
                    >
                      {[400, 500, 600, 700].map((w) => (
                        <option key={`sw-${w}`} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </PanelSection>
          </div>
        </aside>
      )}

      {/* ── CENTER CANVAS ── */}
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-10 flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setLeftPanelOpen((value) => !value)}
                className={`rounded-lg p-1.5 transition-colors ${showLeftPanel ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                title={showLeftPanel ? 'Hide tools panel' : 'Show tools panel'}
              >
                <PanelLeft size={15} />
              </button>
              <button
                type="button"
                onClick={() => setRightPanelOpen((value) => !value)}
                className={`rounded-lg p-1.5 transition-colors ${showRightPanel ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                title={showRightPanel ? 'Hide inspector' : 'Show inspector'}
              >
                <PanelRight size={15} />
              </button>
              <button
                type="button"
                onClick={() => setFocusMode((value) => !value)}
                className={`rounded-lg p-1.5 transition-colors ${focusMode ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                title={focusMode ? 'Exit focus mode' : 'Focus on canvas'}
              >
                {focusMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                <span>{selectedPreset.name}</span>
                <ChevronRight size={12} />
                <span>Slide {hasSlides ? activeIndex + 1 : 0}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <h2 className="truncate text-base font-extrabold tracking-tight text-slate-900">
                  {activeScreenshot?.title.replace(/\[\/?accent\]/g, '') || 'Untitled mockup set'}
                </h2>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500">
                  {activeSettings.canvasWidth} × {activeSettings.canvasHeight}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                onClick={undo}
                disabled={history.past.length === 0 && !hasPendingHistory}
                className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-white hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-30"
                title="Undo (Ctrl/Cmd + Z)"
              >
                <Undo2 size={16} />
              </button>
              <button
                onClick={redo}
                disabled={history.future.length === 0 || hasPendingHistory}
                className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-white hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-30"
                title="Redo (Ctrl/Cmd + Shift + Z)"
              >
                <Redo2 size={16} />
              </button>
            </div>

            {hasSlides && (
              <>
                <button
                  onClick={() => setShowGuides((value) => !value)}
                  aria-pressed={showGuides}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${showGuides
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  title="Toggle safe-area and center guides"
                >
                  <Grid3X3 size={15} /> Guides
                </button>
                <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1">
                  <button onClick={() => setZoomScale((z) => Math.max(0.08, z - 0.03))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Zoom out">
                    <ZoomOut size={15} />
                  </button>
                  <span className="w-12 text-center text-[11px] font-bold tabular-nums text-slate-600">{Math.round(zoomScale * 100)}%</span>
                  <button onClick={() => setZoomScale((z) => Math.min(1.1, z + 0.03))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Zoom in">
                    <ZoomIn size={15} />
                  </button>
                  <button onClick={() => setZoomScale(fitScale)} className="rounded-lg px-2 py-1.5 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50" title="Fit to viewport">Fit</button>
                </div>
              </>
            )}

            <button
              onClick={exportCurrent}
              disabled={!hasSlides || isExporting}
              className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-300 transition-all hover:bg-indigo-600 hover:shadow-indigo-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            >
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Export
            </button>
          </div>
        </header>

        <div
          className={`canvas-workspace relative flex-1 overflow-auto p-8 transition-colors ${isFileDragging ? 'is-dragging' : ''}`}
          ref={containerRef}
          onDragOver={(e) => { e.preventDefault(); setIsFileDragging(true); }}
          onDragLeave={() => setIsFileDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsFileDragging(false);
            if (e.dataTransfer.files) {
              const arr = Array.from(e.dataTransfer.files as FileList);
              addImages(arr.filter((f) => f.type.startsWith('image/')));
            }
          }}
        >
          {hasSlides && (
            <div className="absolute left-4 top-4 z-20 flex items-center gap-1 rounded-xl border border-slate-200 bg-white/90 p-1 shadow-lg shadow-slate-300/40 backdrop-blur-xl">
              <button
                onClick={() => setDragMode(true)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold transition-colors ${dragMode
                  ? 'bg-slate-950 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
                  }`}
                title="Move text and device directly on the canvas"
              >
                <Move size={14} /> Move
              </button>
              <button
                onClick={() => setDragMode(false)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold transition-colors ${!dragMode
                  ? 'bg-slate-950 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
                  }`}
                title="Lock canvas elements"
              >
                <MousePointer2 size={14} /> Select
              </button>
            </div>
          )}
          <div className="min-h-full min-w-full flex items-center justify-center">
            {hasSlides && activeScreenshot ? (
              <div
                className="shrink-0 overflow-hidden rounded-md shadow-[0_24px_80px_rgba(15,23,42,0.20)] ring-1 ring-slate-900/5"
                style={{
                  width: activeSettings.canvasWidth * zoomScale,
                  height: activeSettings.canvasHeight * zoomScale,
                }}
              >
                <div
                  style={{
                    transform: `scale(${zoomScale})`,
                    transformOrigin: 'top left',
                    width: activeSettings.canvasWidth,
                    height: activeSettings.canvasHeight,
                  }}
                >
                  <MockupTemplate
                    screenshot={localizedActiveScreenshot ?? activeScreenshot}
                    settings={activeSettings}
                    draggingTarget={draggingTarget}
                    selectedLayer={selectedLayer}
                    onSelectLayer={setSelectedLayer}
                    onStartDrag={dragMode ? handleStartDrag : undefined}
                    showGuides={showGuides}
                  />
                </div>
              </div>
            ) : (
              <div className="pointer-events-none flex max-w-lg flex-col items-center text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-indigo-600 shadow-xl shadow-slate-200 ring-1 ring-slate-200">
                  <ImageIcon size={32} />
                </div>
                <span className="mb-3 rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">Start a project</span>
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Turn screenshots into launch-ready stories</h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500">
                  Drop your app screens here. Frameflow will build editable slides with your active brand preset.
                </p>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                  <label className="pointer-events-auto flex cursor-pointer items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-indigo-600">
                    <Plus size={17} /> Upload screenshots
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <button
                    type="button"
                    onClick={createDemoProject}
                    className="pointer-events-auto flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    <Sparkles size={16} /> Explore demo
                  </button>
                </div>
                <p className="mt-4 text-xs font-medium text-slate-400">You can also drag and drop PNG, JPG, or WebP files anywhere.</p>
              </div>
            )}
            {isFileDragging && (
              <div className="pointer-events-none absolute inset-5 z-30 flex items-center justify-center rounded-3xl border-2 border-dashed border-indigo-400 bg-indigo-50/90 backdrop-blur-sm">
                <div className="text-center">
                  <Upload size={32} className="mx-auto text-indigo-600" />
                  <p className="mt-3 text-lg font-extrabold text-indigo-900">Drop screenshots to add slides</p>
                  <p className="mt-1 text-sm text-indigo-600">PNG, JPG, and WebP are supported</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {hasSlides && !focusMode && (
          <div className="z-10 h-40 shrink-0 border-t border-slate-200 bg-white/95 shadow-[0_-8px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl">
            <div className="flex h-9 items-center justify-between px-6 text-[11px] font-semibold text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2"><GripVertical size={13} /> Scenes · drag to reorder</span>
                {selectedSlideIds.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-600">{selectedSlideIds.length} selected</span>
                    <button type="button" onClick={applyStyleToSelectedSlides} className="rounded-md px-2 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50">Apply style</button>
                    <button type="button" onClick={duplicateSelectedSlides} className="rounded-md px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100">Duplicate</button>
                    <button type="button" onClick={removeSelectedSlides} className="rounded-md px-2 py-1 text-[10px] font-bold text-red-500 hover:bg-red-50">Remove</button>
                    <button type="button" onClick={() => setSelectedSlideIds([])} className="rounded-md px-2 py-1 text-[10px] font-bold text-slate-400 hover:bg-slate-100">Clear</button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <X size={12} /> Clear all
              </button>
            </div>
            <div className="flex h-[124px] items-start gap-3 overflow-x-auto px-6 pb-4">
              {screenshots.map((s, i) => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', s.id);
                    setDraggedSlideId(s.id);
                    setDropTargetId(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (draggedSlideId && draggedSlideId !== s.id) setDropTargetId(s.id);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const draggedId = e.dataTransfer.getData('text/plain') || draggedSlideId;
                    if (draggedId) moveScreenshot(draggedId, s.id);
                    setDraggedSlideId(null);
                    setDropTargetId(null);
                  }}
                  onDragEnd={() => {
                    setDraggedSlideId(null);
                    setDropTargetId(null);
                  }}
                  onClick={() => setActiveIndex(i)}
                  className={`group relative h-24 w-16 flex-shrink-0 cursor-grab rounded-xl border-2 bg-white p-1 shadow-sm transition-all active:cursor-grabbing ${i === activeIndex
                    ? 'border-indigo-600 shadow-md -translate-y-0.5'
                    : 'border-gray-200 opacity-75 hover:border-gray-300 hover:opacity-100'
                    } ${draggedSlideId === s.id ? 'opacity-30 scale-95' : ''} ${dropTargetId === s.id ? 'translate-x-2 ring-2 ring-indigo-200' : ''}`}
                >
                  <div className="relative h-full w-full overflow-hidden rounded-lg bg-gray-100">
                    <img src={s.url} className="w-full h-full object-cover pointer-events-none" alt={`Slide ${i + 1}`} />
                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); toggleSlideSelection(s.id); }}
                      className={`absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full border transition-all ${selectedSlideIds.includes(s.id) ? 'border-indigo-600 bg-indigo-600 text-white opacity-100' : 'border-white/80 bg-slate-950/40 text-transparent opacity-0 group-hover:opacity-100'}`}
                      title={selectedSlideIds.includes(s.id) ? 'Remove from selection' : 'Select slide'}
                      draggable={false}
                    >
                      <Check size={10} strokeWidth={3} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeScreenshot(s.id); }}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      title="Remove"
                      draggable={false}
                    >
                      <Trash2 size={11} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent pt-4 pb-1 text-white text-[10px] font-bold text-center">
                      {i + 1}
                    </div>
                  </div>
                </div>
              ))}
              <label className="flex h-24 w-16 flex-shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600">
                <Plus size={22} className="mb-1" />
                <span className="text-[10px] font-bold">Add scene</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </div>
        )}
      </main>

      {/* ── RIGHT PANEL ── */}
      {showRightPanel && (
        <aside className="flex w-[272px] shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white xl:w-[288px] 2xl:w-[320px]">
          {hasSlides && activeScreenshot ? (
            <div className="space-y-5 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Inspector</p>
                  <h2 className="mt-1 text-base font-extrabold tracking-tight text-slate-900">Slide {activeIndex + 1}</h2>
                </div>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                  {activeIndex + 1} / {screenshots.length}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                {([
                  { id: 'content' as const, label: 'Content', icon: Type },
                  { id: 'position' as const, label: 'Position', icon: MousePointer2 },
                  { id: 'export' as const, label: 'Export', icon: Download },
                ]).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setInspectorTab(id)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-bold transition-all ${inspectorTab === id
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>

              {inspectorTab === 'content' && (
                <>
                  <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Tip</p>
                    <p className="text-xs text-indigo-800 mt-1">
                      Editing here is per-slide. To make a change global, toggle <strong>Editing all slides</strong> in the left panel.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Title</label>
                    <textarea
                      value={localizedActiveScreenshot?.title ?? activeScreenshot.title}
                      onChange={(e) => updateCurrentCopy('title', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                      rows={3}
                      placeholder="Enter title... use [accent]word[/accent] for color"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Subtitle</label>
                    <textarea
                      value={localizedActiveScreenshot?.subtitle ?? activeScreenshot.subtitle}
                      onChange={(e) => updateCurrentCopy('subtitle', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                      rows={3}
                      placeholder="Enter subtitle..."
                    />
                  </div>

                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <label className="text-sm font-semibold text-gray-700">Slide Actions</label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-2 cursor-pointer transition-colors">
                        <ImageIcon size={14} /> Replace
                        <input type="file" accept="image/*" className="hidden" onChange={handleScreenshotReplace} />
                      </label>
                      <button
                        onClick={duplicateScreenshot}
                        className="py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-2"
                      >
                        <Copy size={14} /> Duplicate
                      </button>
                    </div>
                  </div>
                </>
              )}

              {inspectorTab === 'position' && (
                <>
                  <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between px-1">
                      <div>
                        <p className="text-sm font-bold text-slate-800">Layers</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">Select, hide, or lock canvas elements</p>
                      </div>
                      <Layers size={16} className="text-indigo-500" />
                    </div>
                    {([
                      {
                        id: 'text' as const,
                        label: 'Headline & subtitle',
                        icon: Type,
                        visible: activeScreenshot.textVisible !== false,
                        locked: activeScreenshot.textLocked === true,
                      },
                      {
                        id: 'device' as const,
                        label: 'Device mockup',
                        icon: Smartphone,
                        visible: activeScreenshot.deviceVisible !== false,
                        locked: activeScreenshot.deviceLocked === true,
                      },
                    ]).map((layer) => {
                      const Icon = layer.icon;
                      return (
                        <div
                          key={layer.id}
                          className={`flex items-center gap-1 rounded-xl border p-1.5 transition-colors ${selectedLayer === layer.id
                            ? 'border-indigo-200 bg-indigo-50'
                            : 'border-slate-200 bg-slate-50/70 hover:bg-slate-50'
                            }`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedLayer(layer.id)}
                            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left"
                          >
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${selectedLayer === layer.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 shadow-sm'}`}>
                              <Icon size={14} />
                            </span>
                            <span className="truncate text-xs font-bold text-slate-700">{layer.label}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              updateCurrentScreenshot(layer.id === 'text'
                                ? { textVisible: !layer.visible }
                                : { deviceVisible: !layer.visible });
                              if (!layer.visible) setSelectedLayer(layer.id);
                            }}
                            className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700"
                            title={layer.visible ? `Hide ${layer.label}` : `Show ${layer.label}`}
                          >
                            {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateCurrentScreenshot(layer.id === 'text'
                              ? { textLocked: !layer.locked }
                              : { deviceLocked: !layer.locked })}
                            className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700"
                            title={layer.locked ? `Unlock ${layer.label}` : `Lock ${layer.label}`}
                          >
                            {layer.locked ? <LockKeyhole size={14} /> : <LockKeyholeOpen size={14} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Move size={16} className="text-indigo-500" /> Drag & Position
                      </label>
                      <button
                        onClick={() => setDragMode((v) => !v)}
                        className={`relative inline-flex w-10 h-6 rounded-full transition-colors ${dragMode ? 'bg-indigo-600' : 'bg-gray-300'
                          }`}
                        title={dragMode ? 'Disable drag mode' : 'Enable drag mode'}
                      >
                        <span
                          className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow transition-transform ${dragMode ? 'translate-x-4' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400">
                      {dragMode
                        ? 'Click & drag text or device on canvas to reposition.'
                        : 'Enable drag mode to move elements on canvas.'}
                    </p>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nudge Text</p>
                      <div className="grid grid-cols-4 gap-1.5 text-xs">
                        <button onClick={() => nudgeCurrent('text', 'x', -10)} className="py-2 rounded border border-gray-200 hover:bg-gray-50">← Left</button>
                        <button onClick={() => nudgeCurrent('text', 'x', 10)} className="py-2 rounded border border-gray-200 hover:bg-gray-50">Right →</button>
                        <button onClick={() => nudgeCurrent('text', 'y', -10)} className="py-2 rounded border border-gray-200 hover:bg-gray-50">↑ Up</button>
                        <button onClick={() => nudgeCurrent('text', 'y', 10)} className="py-2 rounded border border-gray-200 hover:bg-gray-50">Down ↓</button>
                      </div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nudge Device</p>
                      <div className="grid grid-cols-4 gap-1.5 text-xs">
                        <button onClick={() => nudgeCurrent('device', 'x', -10)} className="py-2 rounded border border-gray-200 hover:bg-gray-50">← Left</button>
                        <button onClick={() => nudgeCurrent('device', 'x', 10)} className="py-2 rounded border border-gray-200 hover:bg-gray-50">Right →</button>
                        <button onClick={() => nudgeCurrent('device', 'y', -10)} className="py-2 rounded border border-gray-200 hover:bg-gray-50">↑ Up</button>
                        <button onClick={() => nudgeCurrent('device', 'y', 10)} className="py-2 rounded border border-gray-200 hover:bg-gray-50">Down ↓</button>
                      </div>
                    </div>

                    <button
                      onClick={resetCurrentPosition}
                      className="w-full py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-2"
                    >
                      <LocateFixed size={14} /> Reset Position
                    </button>
                  </div>
                </>
              )}

              {inspectorTab === 'export' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                      <Settings2 size={16} className="text-indigo-500" /> Export quality
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">Choose a web-ready format or exact store-ready output.</p>
                    <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-200/60 p-1">
                      {(['png', 'jpeg', 'webp'] as const).map((format) => (
                        <button key={format} type="button" onClick={() => setExportFormat(format)} className={`rounded-lg py-2 text-[10px] font-bold uppercase transition-all ${exportFormat === format ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{format === 'jpeg' ? 'JPG' : format}</button>
                      ))}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 rounded-xl bg-slate-200/60 p-1">
                      {([1, 2, 3] as const).map((scale) => (
                        <button
                          key={scale}
                          onClick={() => setExportScale(scale)}
                          className={`rounded-lg py-2 text-xs font-bold transition-all ${exportScale === scale
                            ? 'bg-white text-indigo-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                          {scale}× {scale === 1 ? 'Standard' : 'Retina'}
                        </button>
                      ))}
                    </div>
                    {exportFormat !== 'png' && (
                      <label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Quality · {Math.round(exportQuality * 100)}%
                        <input type="range" min="0.5" max="1" step="0.01" value={exportQuality} onChange={(event) => setExportQuality(Number(event.target.value))} className="mt-2 w-full" />
                      </label>
                    )}
                    {exportFormat === 'png' && (
                      <label className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600"><span>Transparent background</span><input type="checkbox" checked={transparentExport} onChange={(event) => setTransparentExport(event.target.checked)} className="h-4 w-4 accent-indigo-600" /></label>
                    )}
                    <label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Filename template
                      <input value={filenamePattern} onChange={(event) => setFilenamePattern(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-mono text-[10px] normal-case text-slate-600 outline-none focus:border-indigo-400" />
                    </label>
                    <p className="mt-1 text-[9px] leading-relaxed text-slate-400">Tokens: {'{project}'} {'{locale}'} {'{index}'} {'{width}'} {'{height}'} {'{title}'}</p>
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">Preview</span><span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500">{activeLocale}</span></div>
                      <p className="mt-2 truncate font-mono text-[10px] font-bold text-slate-700">{buildExportFilename(activeScreenshot, activeIndex, activeSettings)}</p>
                      <p className="mt-1 font-mono text-[10px] text-slate-400">{activeSettings.canvasWidth * exportScale} × {activeSettings.canvasHeight * exportScale} · {exportFormat.toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-bold text-slate-800"><ShieldCheck size={16} className="text-indigo-500" /> Readiness</span><span className={`text-[10px] font-bold ${exportChecks.every((check) => check.ok) ? 'text-emerald-600' : 'text-amber-600'}`}>{exportChecks.filter((check) => check.ok).length}/{exportChecks.length}</span></div>
                    <div className="mt-3 space-y-2">{exportChecks.map((check) => <div key={check.label} className="flex items-center gap-2 text-[11px] font-medium text-slate-600">{check.ok ? <Check size={13} className="text-emerald-500" /> : <X size={13} className="text-amber-500" />} {check.label}</div>)}</div>
                  </div>
                  <button
                    onClick={exportCurrent}
                    disabled={isExporting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
                  >
                    {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                    Export current slide
                  </button>
                  <button
                    onClick={exportAll}
                    disabled={isExporting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Download size={16} /> Export all {exportFormat === 'jpeg' ? 'JPGs' : `${exportFormat.toUpperCase()}s`}
                  </button>
                  {selectedSlideIds.length > 0 && (
                    <button
                      onClick={() => exportZip(true)}
                      disabled={isExporting}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Check size={16} /> Export {selectedSlideIds.length} selected
                    </button>
                  )}
                  <button
                    onClick={() => exportZip(false)}
                    disabled={isExporting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 py-3 text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50"
                  >
                    <Archive size={16} /> Download organized ZIP
                  </button>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 flex justify-between">
                <button
                  onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
                  disabled={activeIndex === 0}
                  className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Previous Slide"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm text-gray-500 self-center">
                  Slide {activeIndex + 1} of {screenshots.length}
                </span>
                <button
                  onClick={() => setActiveIndex(Math.min(screenshots.length - 1, activeIndex + 1))}
                  disabled={activeIndex === screenshots.length - 1}
                  className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next Slide"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Layers size={28} className="text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-600">No slides yet</p>
              <p className="text-xs text-gray-400">
                Upload screenshots from the canvas or drop images anywhere to get started.
              </p>
              <label className="mt-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer hover:bg-indigo-700 transition-colors flex items-center gap-2">
                <Plus size={16} /> Upload
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          )}
        </aside>
      )}

      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold shadow-2xl backdrop-blur-xl ${toast.tone === 'success'
            ? 'border-emerald-200 bg-emerald-50/95 text-emerald-800'
            : 'border-red-200 bg-red-50/95 text-red-700'
            }`}
        >
          {toast.tone === 'success' ? <Check size={16} /> : <X size={16} />}
          {toast.message}
        </div>
      )}

      {confirmClearOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="clear-project-title">
          <div className="w-full max-w-sm rounded-3xl border border-white/20 bg-white p-6 shadow-2xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Trash2 size={20} />
            </div>
            <h2 id="clear-project-title" className="mt-4 text-lg font-extrabold tracking-tight text-slate-900">Clear this project?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">All scenes will be removed from the workspace. You can still use Undo immediately afterward.</p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Keep project
              </button>
              <button
                type="button"
                onClick={clearProject}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700"
              >
                Clear project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden export layer */}
      <div
        className="fixed top-0 pointer-events-none"
        style={{ left: '-9999px', zIndex: 0 }}
        aria-hidden="true"
      >
        {screenshots.map((s) => (
          <MockupTemplate
            key={`export-${s.id}`}
            id={`export-${s.id}`}
            screenshot={activeLocale === 'en-US' ? s : {
              ...s,
              ...(s.translations?.[activeLocale] ?? { title: s.title, subtitle: s.subtitle }),
            }}
            settings={{ ...settings, ...s.settingsOverrides }}
          />
        ))}
      </div>
    </div>
  );
}
