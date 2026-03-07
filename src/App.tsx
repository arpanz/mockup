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
} from 'lucide-react';

type Point = { x: number; y: number };

type Settings = {
  background: string;
  titleColor: string;
  accentColor: string;
  subtitleColor: string;
  layout: 'text-top' | 'text-bottom' | 'centered';
  phonePositionMode: 'centered' | 'half-down';
  textAlign: 'left' | 'center' | 'right';
  deviceAlign: 'left' | 'center' | 'right';
  deviceFrame: boolean;
  imageFit: 'cover' | 'contain';
  titleFontFamily: string;
  subtitleFontFamily: string;
  titleFontSize: number;
  subtitleFontSize: number;
  titleFontWeight: number;
  subtitleFontWeight: number;
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
  settingsOverrides?: Partial<Settings>;
};

type AppPreset = {
  id: string;
  name: string;
  title: string;
  subtitle: string;
  settings: Partial<Settings>;
};

type SectionKey = 'presets' | 'layout' | 'device' | 'typography';

const BACKGROUNDS = [
  '#d8d8dc',
  '#ffffff',
  '#f8fafc',
  '#0f172a',
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

const DEFAULT_SETTINGS: Settings = {
  background: 'linear-gradient(180deg, #F8FAFC 0%, #EEF2F7 100%)',
  titleColor: '#0F172A',
  accentColor: '#2563EB',
  subtitleColor: '#334155',
  layout: 'text-top',
  phonePositionMode: 'centered',
  textAlign: 'center',
  deviceAlign: 'center',
  deviceFrame: true,
  imageFit: 'cover',
  titleFontFamily: "'Inter', sans-serif",
  subtitleFontFamily: "'Inter', sans-serif",
  titleFontSize: 96,
  subtitleFontSize: 43,
  titleFontWeight: 700,
  subtitleFontWeight: 500,
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
      deviceRotation: -4,
      deviceTiltY: -6,
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
      deviceRotation: 10,
      deviceTiltX: 3,
      deviceTiltY: 8,
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
      deviceRotation: -14,
      deviceTiltX: 4,
      deviceTiltY: -10,
      deviceShadow: 56,
    },
  },
];

const PRESET_STORAGE_KEY = 'mockup-app-presets-v1';
const PRESET_SELECTION_KEY = 'mockup-selected-preset-v1';

const makeId = () => Math.random().toString(36).slice(2, 11);

const PanelSection = ({
  title,
  description,
  open,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <section className="border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden">
    <button
      type="button"
      onClick={onToggle}
      className="w-full px-4 py-4 flex items-start justify-between text-left hover:bg-gray-50 transition-colors"
    >
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
      <ChevronRight size={18} className={`mt-0.5 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
    </button>
    {open && <div className="px-4 pb-4 space-y-5">{children}</div>}
  </section>
);

const MockupTemplate = ({
  screenshot,
  settings,
  id,
  draggingTarget,
  onStartDrag,
}: {
  key?: React.Key;
  screenshot: Screenshot;
  settings: Settings;
  id?: string;
  draggingTarget?: 'text' | 'device' | null;
  onStartDrag?: (target: 'text' | 'device', e: React.PointerEvent) => void;
}) => {
  const { layout } = settings;
  const dragEnabled = Boolean(onStartDrag);
  const titleParts = screenshot.title.split(/(\[accent\][\s\S]*?\[\/accent\])/g).filter(Boolean);
  const baseDeviceOffsetY =
    settings.phonePositionMode === 'half-down'
      ? layout === 'text-top'
        ? 120
        : layout === 'centered'
          ? 64
          : 0
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

  // FIX: cursor should only be move when dragEnabled, not fighting with pointer on children
  const dragClass = dragEnabled ? 'cursor-move touch-none select-none' : '';

  const TextContent = () => (
    <div
      className={`w-full flex flex-col px-16 ${getTextAlignClass()} ${dragClass}`}
      style={{ transform: `translate(${screenshot.textOffset.x}px, ${screenshot.textOffset.y}px)` }}
      onPointerDown={dragEnabled ? (e) => onStartDrag?.('text', e) : undefined}
    >
      <h1
        style={{
          color: settings.titleColor,
          fontSize: `${settings.titleFontSize}px`,
          fontWeight: settings.titleFontWeight,
          lineHeight: 1.08,
          fontFamily: settings.titleFontFamily,
          letterSpacing: '-0.01em',
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
            lineHeight: 1.4,
            marginTop: `${settings.textSpacing}px`,
          }}
          className="whitespace-pre-wrap break-words"
        >
          {screenshot.subtitle}
        </p>
      )}
    </div>
  );

  const DeviceFrame = ({ bleed }: { bleed: 'top' | 'bottom' | 'none' }) => {
    const isBleedBottom = bleed === 'bottom';
    const isBleedTop = bleed === 'top';
    const isNone = bleed === 'none';

    const frameClasses = `relative bg-white overflow-hidden flex-shrink-0 aspect-[9/19.5]
      ${isBleedBottom ? 'rounded-t-[56px]' : ''}
      ${isBleedTop ? 'rounded-b-[56px]' : ''}
      ${isNone ? 'rounded-[56px]' : ''}
    `;

    // FIX: object-top should always apply, not just in cover mode
    const imgClasses = `w-full h-full object-top ${settings.imageFit === 'contain' ? 'object-contain bg-gray-100' : 'object-cover'
      }`;

    if (!settings.deviceFrame) {
      return (
        <img
          src={screenshot.url}
          className={`${frameClasses} ${imgClasses}`}
          style={{ width: `${settings.deviceScale}%`, ...shadowStyle }}
          alt="App Screenshot"
        />
      );
    }

    return (
      <div
        className={`${frameClasses} border-[#161617]`}
        style={{
          width: `${settings.deviceScale}%`,
          borderWidth: `${settings.deviceBorder}px`,
          ...shadowStyle,
        }}
      >
        <img src={screenshot.url} className={imgClasses} alt="App Screenshot" />
      </div>
    );
  };

  const DeviceWrapper = ({ bleed, className }: { bleed: 'top' | 'bottom' | 'none'; className: string }) => (
    <div
      className={`${className} ${dragClass}`}
      style={{
        transform: `perspective(1600px) translate(${screenshot.deviceOffset.x}px, ${screenshot.deviceOffset.y + baseDeviceOffsetY}px) rotateX(${settings.deviceTiltX}deg) rotateY(${settings.deviceTiltY}deg) rotateZ(${settings.deviceRotation}deg)`,
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      }}
      onPointerDown={dragEnabled ? (e) => onStartDrag?.('device', e) : undefined}
    >
      <DeviceFrame bleed={bleed} />
    </div>
  );

  return (
    <div id={id} className="relative flex flex-col overflow-hidden" style={{ width: 1080, height: 1920, background: settings.background }}>
      {layout === 'text-top' && (
        <>
          <div className="flex-none pt-24 pb-12 z-10 flex flex-col items-center justify-center w-full">
            <TextContent />
          </div>
          <DeviceWrapper
            bleed={settings.phonePositionMode === 'centered' ? 'none' : 'bottom'}
            className={`flex-1 w-full flex ${getDeviceAlignClass()} ${settings.phonePositionMode === 'centered' ? 'items-start pt-8' : 'items-start pt-16'
              }`}
          />
        </>
      )}

      {layout === 'text-bottom' && (
        <>
          <DeviceWrapper
            bleed={settings.phonePositionMode === 'centered' ? 'none' : 'top'}
            className={`flex-1 w-full flex ${getDeviceAlignClass()} items-end ${settings.phonePositionMode === 'centered' ? 'pb-8' : 'pb-16'
              }`}
          />
          <div className="flex-none pt-12 pb-24 z-10 flex flex-col items-center justify-center w-full">
            <TextContent />
          </div>
        </>
      )}

      {layout === 'centered' && (
        <>
          <div className="flex-none pt-24 pb-8 z-10 flex flex-col items-center justify-center w-full">
            <TextContent />
          </div>
          <DeviceWrapper bleed="none" className={`flex-1 w-full flex ${getDeviceAlignClass()} items-center pb-16`} />
        </>
      )}

      {dragEnabled && (
        <div className="absolute top-6 right-6 flex gap-2 z-30 pointer-events-none">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${draggingTarget === 'text'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white/90 text-gray-700 border-gray-200'
              }`}
          >
            Text
          </span>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${draggingTarget === 'device'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white/90 text-gray-700 border-gray-200'
              }`}
          >
            Device
          </span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  // FIX: applyToAll default is true but was invisible — now shown prominently
  const [applyToAll, setApplyToAll] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [dragMode, setDragMode] = useState(true);
  const [draggingTarget, setDraggingTarget] = useState<'text' | 'device' | null>(null);
  const [isFileDragging, setIsFileDragging] = useState(false);
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
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PRESETS;
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
  const [fitScale, setFitScale] = useState(0.2);
  const [zoomScale, setZoomScale] = useState(0.2);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startOffset: Point;
    target: 'text' | 'device';
    activeId: string;
  } | null>(null);

  const activeScreenshot = screenshots[activeIndex];
  const hasSlides = screenshots.length > 0;
  const selectedPreset =
    appPresets.find((p) => p.id === selectedPresetId) || appPresets[0] || DEFAULT_PRESETS[0];
  const activeSettings = activeScreenshot
    ? { ...settings, ...activeScreenshot.settingsOverrides }
    : settings;

  // FIX: depend only on selectedPresetId, not selectedPreset object (avoids infinite loop)
  useEffect(() => {
    const preset = appPresets.find((p) => p.id === selectedPresetId);
    if (!preset) return;
    setPresetDraft({
      name: preset.name,
      title: preset.title,
      subtitle: preset.subtitle,
    });
    // Also instantly apply preset settings to global settings when user changes the dropdown
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

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateFitScale = useCallback(() => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const availableWidth = Math.max(0, width - 64);
    const availableHeight = Math.max(0, height - 64);
    const scaleX = availableWidth / 1080;
    const scaleY = availableHeight / 1920;
    setFitScale(Math.min(scaleX, scaleY));
  }, []);

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

  useEffect(() => {
    return () => {
      screenshots.forEach((s) => {
        if (s.url.startsWith('blob:')) URL.revokeObjectURL(s.url);
      });
    };
  }, [screenshots]);

  const updateSetting = (updates: Partial<Settings>) => {
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

  const buildPresetPayload = () => ({
    name: presetDraft.name.trim() || 'Untitled Preset',
    title: presetDraft.title,
    subtitle: presetDraft.subtitle,
    settings: snapshotPresetSettings(),
  });

  const savePresetChanges = () => {
    const payload = buildPresetPayload();
    setAppPresets((prev) =>
      prev.map((p) => (p.id === selectedPreset.id ? { ...p, ...payload } : p))
    );
  };

  const createPreset = () => {
    const newPreset: AppPreset = { id: makeId(), ...buildPresetPayload() };
    setAppPresets((prev) => [...prev, newPreset]);
    setSelectedPresetId(newPreset.id);
  };

  const deletePreset = () => {
    if (appPresets.length <= 1) return;
    const filtered = appPresets.filter((p) => p.id !== selectedPreset.id);
    setAppPresets(filtered);
    setSelectedPresetId(filtered[0].id);
  };

  const applyPresetToSlides = (scope: 'current' | 'all') => {
    if (!selectedPreset) return;
    if (scope === 'all') {
      setSettings((prev) => ({ ...prev, ...selectedPreset.settings }));
      setScreenshots((prev) =>
        prev.map((slide) => ({
          ...slide,
          title: selectedPreset.title || slide.title,
          subtitle: selectedPreset.subtitle || slide.subtitle,
          textOffset: { x: 0, y: 0 },
          deviceOffset: { x: 0, y: 0 },
          settingsOverrides: undefined,
        }))
      );
      return;
    }
    if (!activeScreenshot) return;
    setScreenshots((prev) =>
      prev.map((slide, index) => {
        if (index !== activeIndex) return slide;
        return {
          ...slide,
          title: selectedPreset.title || slide.title,
          subtitle: selectedPreset.subtitle || slide.subtitle,
          textOffset: { x: 0, y: 0 },
          deviceOffset: { x: 0, y: 0 },
          settingsOverrides: { ...slide.settingsOverrides, ...selectedPreset.settings },
        };
      })
    );
  };

  const syncPresetDraftFromCanvas = () => {
    setPresetDraft((prev) => ({
      ...prev,
      title: activeScreenshot?.title || prev.title,
      subtitle: activeScreenshot?.subtitle || prev.subtitle,
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files as FileList);
    addImages(files.filter((f) => f.type.startsWith('image/')));
    // FIX: reset input so same file can be re-uploaded
    e.target.value = '';
  };

  const handleScreenshotReplace = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !activeScreenshot) return;
    const file = e.target.files[0];
    const newUrl = URL.createObjectURL(file);
    setScreenshots((prev) => {
      const previousUrl = prev[activeIndex]?.url;
      const next = prev.map((s, i) => (i === activeIndex ? { ...s, url: newUrl } : s));
      if (previousUrl?.startsWith('blob:') && !next.some((s) => s.url === previousUrl)) {
        URL.revokeObjectURL(previousUrl);
      }
      return next;
    });
    e.target.value = '';
  };

  const addImages = (files: File[]) => {
    if (files.length === 0) return;
    const preset = selectedPreset || DEFAULT_PRESETS[0];
    const newScreenshots: Screenshot[] = files.map((file) => ({
      id: makeId(),
      url: URL.createObjectURL(file),
      title: preset.title,
      subtitle: preset.subtitle,
      textOffset: { x: 0, y: 0 },
      deviceOffset: { x: 0, y: 0 },
      settingsOverrides: { ...preset.settings },
    }));
    // FIX: use functional form to get fresh prev and correctly set activeIndex
    setScreenshots((prev) => {
      const next = [...prev, ...newScreenshots];
      // Set to first newly added slide if this is the first upload
      if (prev.length === 0) setActiveIndex(0);
      return next;
    });
  };

  const removeScreenshot = (id: string) => {
    setScreenshots((prev) => {
      const removed = prev.find((s) => s.id === id);
      const filtered = prev.filter((s) => s.id !== id);
      if (removed?.url.startsWith('blob:') && !filtered.some((s) => s.url === removed.url)) {
        URL.revokeObjectURL(removed.url);
      }
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

  // FIX: nudge covers all 4 directions for both text and device
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

  const exportCurrent = async () => {
    if (!activeScreenshot) return;
    setIsExporting(true);
    try {
      const node = document.getElementById(`export-${activeScreenshot.id}`);
      if (!node) throw new Error('Export node not found');
      const dataUrl = await toPng(node, { width: 1080, height: 1920, pixelRatio: 1 });
      const link = document.createElement('a');
      link.download = `mockup-slide-${activeIndex + 1}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportZip = async () => {
    if (screenshots.length === 0) return;
    setIsExporting(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < screenshots.length; i++) {
        const s = screenshots[i];
        const node = document.getElementById(`export-${s.id}`);
        if (!node) continue;
        const dataUrl = await toPng(node, { width: 1080, height: 1920, pixelRatio: 1 });
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
        zip.file(`mockup-${i + 1}.png`, base64Data, { base64: true });
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      const zipContent = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.download = 'mockups.zip';
      link.href = URL.createObjectURL(zipContent);
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch (err) {
      console.error('Zip Export failed', err);
      alert('Zip Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportAll = async () => {
    if (screenshots.length === 0) return;
    setIsExporting(true);
    try {
      for (let i = 0; i < screenshots.length; i++) {
        const s = screenshots[i];
        const node = document.getElementById(`export-${s.id}`);
        if (!node) continue;
        const dataUrl = await toPng(node, { width: 1080, height: 1920, pixelRatio: 1 });
        const link = document.createElement('a');
        link.download = `mockup-${i + 1}.png`;
        link.href = dataUrl;
        link.click();
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (err) {
      console.error('Export failed', err);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      {/* ── LEFT PANEL ── */}
      <div className="w-96 bg-gray-50 border-r border-gray-200 flex flex-col overflow-y-auto shrink-0">
        <div className="p-4 space-y-4">
          {/* Workflow card */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-100">Workflow</p>
            <h2 className="text-lg font-semibold mt-2">Faster multi-app mockups</h2>
            <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-medium">
              <div className="rounded-xl bg-white/10 px-3 py-2">1. Pick a preset</div>
              <div className="rounded-xl bg-white/10 px-3 py-2">2. Upload shots</div>
              <div className="rounded-xl bg-white/10 px-3 py-2">3. Tilt & tune</div>
              <div className="rounded-xl bg-white/10 px-3 py-2">4. Export</div>
            </div>
          </div>

          {/* FIX: Apply-to-all toggle now visible prominently at top of left panel */}
          <div
            className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-colors ${applyToAll
                ? 'bg-indigo-50 border-indigo-200'
                : 'bg-amber-50 border-amber-200'
              }`}
          >
            <div>
              <p className={`text-sm font-semibold ${applyToAll ? 'text-indigo-800' : 'text-amber-800'}`}>
                {applyToAll ? 'Editing all slides' : 'Editing current slide only'}
              </p>
              <p className={`text-xs mt-0.5 ${applyToAll ? 'text-indigo-500' : 'text-amber-600'}`}>
                {applyToAll ? 'Changes apply globally' : 'Only this slide is affected'}
              </p>
            </div>
            <button
              onClick={() => setApplyToAll((v) => !v)}
              className={`relative inline-flex w-11 h-6 rounded-full transition-colors shrink-0 ${applyToAll ? 'bg-indigo-600' : 'bg-amber-400'
                }`}
            >
              <span
                className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow transition-transform ${applyToAll ? 'translate-x-5' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>

          {/* Brand Presets */}
          <PanelSection
            title="Brand Presets"
            description="Switching preset instantly previews that look. Save a polished style per app."
            open={openSections.presets}
            onToggle={() => toggleSection('presets')}
          >
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

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preset Name</label>
              <input
                value={presetDraft.name}
                onChange={(e) => setPresetDraft((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="Fitness App Launch"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Default Title</label>
              <textarea
                value={presetDraft.title}
                onChange={(e) => setPresetDraft((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                rows={3}
                placeholder="Use [accent]accent tags[/accent] to highlight words"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Default Subtitle</label>
              <textarea
                value={presetDraft.subtitle}
                onChange={(e) => setPresetDraft((prev) => ({ ...prev, subtitle: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                rows={3}
                placeholder="Clean supporting copy for new screenshots"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={savePresetChanges}
                className="px-3 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Update Preset
              </button>
              <button
                onClick={createPreset}
                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Save as New
              </button>
              <button
                onClick={syncPresetDraftFromCanvas}
                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                title="Pull title & subtitle from current slide into this draft"
              >
                Use Canvas Copy
              </button>
              <button
                onClick={deletePreset}
                disabled={appPresets.length <= 1}
                className="px-3 py-2.5 rounded-xl border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => applyPresetToSlides('current')}
                disabled={!hasSlides}
                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply to Current
              </button>
              <button
                onClick={() => applyPresetToSlides('all')}
                disabled={!hasSlides}
                className="px-3 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply to All Slides
              </button>
            </div>
          </PanelSection>

          {/* Layout */}
          <PanelSection
            title="Layout"
            description="Control canvas background, content flow, text and device alignment."
            open={openSections.layout}
            onToggle={() => toggleSection('layout')}
          >
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <ImageIcon size={16} className="text-indigo-500" /> Background
              </label>
              <div className="grid grid-cols-6 gap-2 mb-3">
                {BACKGROUNDS.map((bg, i) => (
                  <button
                    key={i}
                    onClick={() => updateSetting({ background: bg })}
                    className={`w-9 h-9 rounded-full border-2 transition-all hover:scale-110 ${activeSettings.background === bg
                        ? 'border-indigo-600 scale-110 shadow-md'
                        : 'border-transparent shadow-sm'
                      }`}
                    style={{ background: bg }}
                    title={bg}
                  />
                ))}
              </div>
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
                    onClick={() => updateSetting({ layout: l })}
                    className={`py-2 px-2 rounded-xl text-xs font-medium border transition-colors text-center ${activeSettings.layout === l
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
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
                      // FIX: only reset x offset, preserve y
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
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Smartphone size={16} className="text-indigo-500" /> Phone Position
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['centered', 'half-down'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => updateSetting({ phonePositionMode: mode })}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors ${activeSettings.phonePositionMode === mode
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    {mode === 'centered' ? 'Centered' : 'Half Down'}
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
                        // FIX: only reset x offset, preserve y
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
          </PanelSection>

          {/* Device */}
          <PanelSection
            title="Device"
            description="Scale, frame, rotate, tilt, and shadow for modern-looking mockups."
            open={openSections.device}
            onToggle={() => toggleSection('device')}
          >
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Device Frame</p>
                  <p className="text-xs text-gray-400 mt-0.5">Show phone bezel around screenshot</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={activeSettings.deviceFrame}
                    onChange={(e) => updateSetting({ deviceFrame: e.target.checked })}
                  />
                  <div
                    className={`block w-10 h-6 rounded-full transition-colors ${activeSettings.deviceFrame ? 'bg-indigo-600' : 'bg-gray-300'
                      }`}
                  />
                  <div
                    className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${activeSettings.deviceFrame ? 'translate-x-4' : ''
                      }`}
                  />
                </div>
              </label>
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
      </div>

      {/* ── CENTER CANVAS ── */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top bar */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-gray-800">Mockup Generator</h1>
          </div>
          <div className="flex items-center gap-3">
            {hasSlides && (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
                <button
                  onClick={() => setZoomScale((z) => Math.max(0.08, z - 0.03))}
                  className="p-1.5 rounded hover:bg-white text-gray-600"
                  title="Zoom out"
                >
                  <ZoomOut size={16} />
                </button>
                <input
                  type="range" min={0.08} max={1.1} step={0.01}
                  value={zoomScale}
                  onChange={(e) => setZoomScale(Number(e.target.value))}
                  className="w-28"
                />
                <button
                  onClick={() => setZoomScale((z) => Math.min(1.1, z + 0.03))}
                  className="p-1.5 rounded hover:bg-white text-gray-600"
                  title="Zoom in"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  onClick={() => setZoomScale(fitScale)}
                  className="text-xs font-semibold px-2 py-1 rounded bg-white border border-gray-200 text-gray-700 hover:border-indigo-300"
                  title="Fit to viewport"
                >
                  Fit
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={exportCurrent}
                disabled={!hasSlides || isExporting}
                className={`px-3 py-2 text-sm rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm ${!hasSlides
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:shadow-md active:scale-95'
                  }`}
              >
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                Export Current
              </button>
              <button
                onClick={exportAll}
                disabled={!hasSlides || isExporting}
                className={`px-3 py-2 text-sm rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm ${!hasSlides
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:shadow-md active:scale-95'
                  }`}
              >
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Export All (PNGs)
              </button>
              <button
                onClick={exportZip}
                disabled={!hasSlides || isExporting}
                className={`px-4 py-2 text-sm rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm ${!hasSlides
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md active:scale-95'
                  }`}
              >
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
                Export ZIP
              </button>
            </div>
          </div>
        </div>

        {/* Canvas area */}
        <div
          className={`flex-1 overflow-auto relative p-8 transition-colors ${isFileDragging ? 'bg-indigo-50' : 'bg-gray-100'
            }`}
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
          <div className="min-h-full min-w-full flex items-center justify-center">
            {hasSlides && activeScreenshot ? (
              <div
                className="shadow-2xl rounded-lg overflow-hidden shrink-0"
                style={{ width: 1080 * zoomScale, height: 1920 * zoomScale }}
              >
                <div
                  style={{
                    transform: `scale(${zoomScale})`,
                    transformOrigin: 'top left',
                    width: 1080,
                    height: 1920,
                  }}
                >
                  <MockupTemplate
                    screenshot={activeScreenshot}
                    settings={activeSettings}
                    draggingTarget={draggingTarget}
                    onStartDrag={dragMode ? handleStartDrag : undefined}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 flex flex-col items-center max-w-md pointer-events-none">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-6">
                  <ImageIcon size={48} className="text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-700 mb-2">Create Professional Mockups</h2>
                <p className="text-gray-500 mb-2">
                  Upload screenshots, choose a reusable preset, then tilt and style the phone.
                </p>
                <p className="text-sm text-gray-400 mb-8">Drag & drop images anywhere on the canvas.</p>
                <label className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold cursor-pointer pointer-events-auto hover:bg-indigo-700 transition-colors shadow-lg flex items-center gap-3">
                  <Plus size={24} /> Upload Screenshots
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Filmstrip */}
        {hasSlides && (
          <div className="h-36 bg-white border-t border-gray-200 flex items-center px-6 gap-4 overflow-x-auto shrink-0 z-10">
            {screenshots.map((s, i) => (
              <div
                key={s.id}
                onClick={() => setActiveIndex(i)}
                className={`relative h-24 w-16 flex-shrink-0 rounded-lg overflow-hidden cursor-pointer border-2 transition-all group ${i === activeIndex
                    ? 'border-indigo-600 shadow-md scale-105'
                    : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
              >
                <img src={s.url} className="w-full h-full object-cover" alt={`Slide ${i + 1}`} />
                <button
                  onClick={(e) => { e.stopPropagation(); removeScreenshot(s.id); }}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  title="Remove"
                >
                  <Trash2 size={12} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] font-bold text-center py-0.5">
                  {i + 1}
                </div>
              </div>
            ))}
            <label className="h-24 w-16 flex-shrink-0 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-indigo-400 hover:text-indigo-500 transition-colors text-gray-400">
              <Plus size={24} className="mb-1" />
              <span className="text-[10px] font-medium">Add More</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL ── always rendered so it's accessible even before upload */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-y-auto shrink-0">
        {hasSlides && activeScreenshot ? (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Slide Content</h2>
                <p className="text-sm text-gray-500 mt-1">Preset: {selectedPreset.name}</p>
              </div>
              <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {activeIndex + 1} / {screenshots.length}
              </span>
            </div>

            <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Tip</p>
              <p className="text-xs text-indigo-800 mt-1">
                Editing here is per-slide. To make a change global, toggle <strong>Editing all slides</strong> in the left panel.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Title</label>
              <textarea
                value={activeScreenshot.title}
                onChange={(e) => updateCurrentScreenshot({ title: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                rows={3}
                placeholder="Enter title... use [accent]word[/accent] for color"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Subtitle</label>
              <textarea
                value={activeScreenshot.subtitle}
                onChange={(e) => updateCurrentScreenshot({ subtitle: e.target.value })}
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

            <div className="border-t border-gray-100 pt-4 space-y-3">
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

              {/* FIX: complete nudge grid — all 4 directions for both text and device */}
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
          // FIX: right panel always shown — display helpful state when no slides
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
      </div>

      {/* Hidden export layer — FIX: use visibility:hidden + z-index 0 so toPng can read layout */}
      <div
        className="fixed top-0 left-0 pointer-events-none"
        style={{ zIndex: 0, visibility: 'hidden' }}
        aria-hidden="true"
      >
        {screenshots.map((s) => (
          <MockupTemplate
            key={`export-${s.id}`}
            id={`export-${s.id}`}
            screenshot={s}
            settings={{ ...settings, ...s.settingsOverrides }}
          />
        ))}
      </div>
    </div>
  );
}
