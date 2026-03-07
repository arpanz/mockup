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
  FileDown
} from 'lucide-react';

type Point = { x: number; y: number };

type Screenshot = {
  id: string;
  url: string;
  title: string;
  subtitle: string;
  textOffset: Point;
  deviceOffset: Point;
  settingsOverrides?: Partial<Settings>;
};

type StorySlide = {
  title: string;
  subtitle: string;
  settingsOverrides: Partial<Settings>;
};

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
};

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

const LIGHT_STORY_OVERRIDES: Partial<Settings> = {
  background: 'linear-gradient(180deg, #F8FAFC 0%, #EEF2F7 100%)',
  titleColor: '#0F172A',
  subtitleColor: '#334155',
  accentColor: '#2563EB',
  titleFontFamily: "'Inter', sans-serif",
  subtitleFontFamily: "'Inter', sans-serif",
  titleFontWeight: 700,
  subtitleFontWeight: 500,
  textSpacing: 26,
  deviceScale: 80,
  deviceBorder: 10,
  deviceFrame: true,
  layout: 'text-top',
  textAlign: 'center',
  deviceAlign: 'center',
  phonePositionMode: 'centered',
};

const DARK_STORY_OVERRIDES: Partial<Settings> = {
  ...LIGHT_STORY_OVERRIDES,
  background: '#0F172A',
  titleColor: '#FFFFFF',
  subtitleColor: '#D1D5DB',
  accentColor: '#60A5FA',
};

const STORY_SLIDES: StorySlide[] = [
  { title: 'Create [accent]QR[/accent] & Barcodes Instantly', subtitle: 'Text • Wi-Fi • Contact • Email', settingsOverrides: LIGHT_STORY_OVERRIDES },
  { title: 'Customize Every [accent]Detail[/accent]', subtitle: 'Colors • Shapes • Logos • Presets', settingsOverrides: LIGHT_STORY_OVERRIDES },
  { title: 'Generate Professional [accent]Barcodes[/accent]', subtitle: 'Code 128 for retail & inventory', settingsOverrides: LIGHT_STORY_OVERRIDES },
  { title: 'Import [accent]CSV[/accent] or Excel Files', subtitle: 'Map Columns • Remove Duplicates', settingsOverrides: LIGHT_STORY_OVERRIDES },
  { title: 'Export Printable [accent]PDF[/accent] Sheets', subtitle: 'A4 & US Letter • Custom Layouts', settingsOverrides: LIGHT_STORY_OVERRIDES },
  { title: 'Generate in [accent]Bulk[/accent]', subtitle: 'Up to 1,000 Codes per Batch', settingsOverrides: LIGHT_STORY_OVERRIDES },
  { title: 'Premium [accent]Dark Mode[/accent] Experience', subtitle: 'Optimized for Day & Night', settingsOverrides: DARK_STORY_OVERRIDES },
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

const MockupTemplate = ({
  screenshot,
  settings,
  id,
  draggingTarget,
  onStartDrag,
}: {
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

  const TextContent = () => (
    <div
      className={`w-full flex flex-col px-16 ${getTextAlignClass()} ${dragEnabled ? 'cursor-move touch-none select-none' : ''}`}
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

    const frameClasses = `relative bg-white shadow-[0_32px_80px_-16px_rgba(0,0,0,0.15)] overflow-hidden flex-shrink-0 aspect-[9/19.5]
      ${isBleedBottom ? 'rounded-t-[56px]' : ''}
      ${isBleedTop ? 'rounded-b-[56px]' : ''}
      ${isNone ? 'rounded-[56px]' : ''}
    `;

    const imgClasses = `w-full h-full object-top ${settings.imageFit === 'contain' ? 'object-contain bg-gray-100' : 'object-cover'}`;

    if (!settings.deviceFrame) {
      return <img src={screenshot.url} className={`${frameClasses} ${imgClasses}`} style={{ width: `${settings.deviceScale}%` }} alt="App Screenshot" />;
    }

    return (
      <div
        className={`${frameClasses} border-[#161617]`}
        style={{
          width: `${settings.deviceScale}%`,
          borderWidth: `${settings.deviceBorder}px`
        }}
      >
        <img src={screenshot.url} className={imgClasses} alt="App Screenshot" />
      </div>
    );
  };

  const DeviceWrapper = ({ bleed, className }: { bleed: 'top' | 'bottom' | 'none'; className: string }) => (
    <div
      className={`${className} ${dragEnabled ? 'cursor-move touch-none select-none' : ''}`}
      style={{ transform: `translate(${screenshot.deviceOffset.x}px, ${screenshot.deviceOffset.y + baseDeviceOffsetY}px)` }}
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
            className={`flex-1 w-full flex ${getDeviceAlignClass()} ${settings.phonePositionMode === 'centered' ? 'items-start pt-8' : 'items-start pt-16'}`}
          />
        </>
      )}

      {layout === 'text-bottom' && (
        <>
          <DeviceWrapper
            bleed={settings.phonePositionMode === 'centered' ? 'none' : 'top'}
            className={`flex-1 w-full flex ${getDeviceAlignClass()} items-end ${settings.phonePositionMode === 'centered' ? 'pb-8' : 'pb-16'}`}
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
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${draggingTarget === 'text' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white/90 text-gray-700 border-gray-200'}`}>
            Text
          </span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${draggingTarget === 'device' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white/90 text-gray-700 border-gray-200'}`}>
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
  const [applyToAll, setApplyToAll] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [settings, setSettings] = useState<Settings>({
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
  });

  const activeSettings = screenshots[activeIndex] ? { ...settings, ...screenshots[activeIndex].settingsOverrides } : settings;

  const updateSetting = (updates: Partial<Settings>) => {
    if (applyToAll) {
      setSettings((s) => ({ ...s, ...updates }));
      setScreenshots((prev) => prev.map(s => {
        if (!s.settingsOverrides) return s;
        const newOverrides = { ...s.settingsOverrides };
        Object.keys(updates).forEach(k => delete newOverrides[k as keyof Settings]);
        return { ...s, settingsOverrides: newOverrides };
      }));
    } else {
      setScreenshots((prev) => prev.map((s, i) => {
        if (i !== activeIndex) return s;
        return {
          ...s,
          settingsOverrides: { ...s.settingsOverrides, ...updates }
        };
      }));
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(0.2);
  const [zoomScale, setZoomScale] = useState(0.2);
  const [dragMode, setDragMode] = useState(true);
  const [draggingTarget, setDraggingTarget] = useState<'text' | 'device' | null>(null);
  const [isFileDragging, setIsFileDragging] = useState(false);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startOffset: Point;
    target: 'text' | 'device';
    activeId: string;
  } | null>(null);

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
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    window.addEventListener('resize', updateFitScale);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateFitScale);
    };
  }, [screenshots.length, updateFitScale]);

  useEffect(() => {
    setZoomScale(fitScale);
  }, [fitScale]);

  // Cleanup object URLs when a component unmounts to prevent memory leaks
  useEffect(() => {
    return () => {
      screenshots.forEach(screenshot => {
        if (screenshot.url.startsWith('blob:')) {
          URL.revokeObjectURL(screenshot.url);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files as FileList);
    addImages(files);
  };

  const handleScreenshotReplace = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const newUrl = URL.createObjectURL(file);

    setScreenshots((prev) => prev.map((s, i) => {
      if (i === activeIndex) {
        URL.revokeObjectURL(s.url);
        return { ...s, url: newUrl };
      }
      return s;
    }));
  };

  const addImages = (files: File[]) => {
    const newScreenshots = files.map((file, index) => {
      const storyIndex = (screenshots.length + index) % STORY_SLIDES.length;
      const story = STORY_SLIDES[storyIndex];
      return {
        id: Math.random().toString(36).slice(2, 11),
        url: URL.createObjectURL(file),
        title: story.title,
        subtitle: story.subtitle,
        textOffset: { x: 0, y: 0 },
        deviceOffset: { x: 0, y: 0 },
        settingsOverrides: { ...story.settingsOverrides },
      };
    });
    setScreenshots((prev) => [...prev, ...newScreenshots]);
    if (screenshots.length === 0) setActiveIndex(0);
  };

  const removeScreenshot = (id: string) => {
    setScreenshots((prev) => {
      const removed = prev.find((s) => s.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.url);
      }
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

    // We need to fetch the blob to create a separate object URL, 
    // or we can reuse the same URL but then revoking it might break duplicates if we're not careful.
    // However, since we now only revoke on component unmount, we can just reuse the url securely!
    const duplicated: Screenshot = {
      ...active,
      id: Math.random().toString(36).slice(2, 11),
      title: active.title,
      subtitle: active.subtitle,
      textOffset: { ...active.textOffset },
      deviceOffset: { ...active.deviceOffset },
      settingsOverrides: active.settingsOverrides ? { ...active.settingsOverrides } : undefined
    };

    setScreenshots((prev) => {
      const newArr = [...prev];
      newArr.splice(activeIndex + 1, 0, duplicated);
      return newArr;
    });
    setActiveIndex(activeIndex + 1);
  };

  const updateCurrentScreenshot = (updates: Partial<Screenshot>) => {
    setScreenshots((prev) => prev.map((s, i) => (i === activeIndex ? { ...s, ...updates } : s)));
  };

  const updateCurrentOffsets = (target: 'text' | 'device', updater: (prev: Point) => Point) => {
    setScreenshots((prev) =>
      prev.map((s, i) => {
        if (i !== activeIndex) return s;
        if (target === 'text') return { ...s, textOffset: updater(s.textOffset) };
        return { ...s, deviceOffset: updater(s.deviceOffset) };
      }),
    );
  };

  const handleStartDrag = (target: 'text' | 'device', e: React.PointerEvent) => {
    if (!dragMode || !screenshots[activeIndex]) return;
    e.preventDefault();
    e.stopPropagation();

    const active = screenshots[activeIndex];
    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startOffset: target === 'text' ? active.textOffset : active.deviceOffset,
      target,
      activeId: active.id,
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
        }),
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
      prev.map((s, i) => (i === activeIndex ? { ...s, textOffset: { x: 0, y: 0 }, deviceOffset: { x: 0, y: 0 } } : s)),
    );
  };

  const nudgeCurrent = (target: 'text' | 'device', axis: 'x' | 'y', delta: number) => {
    updateCurrentOffsets(target, (offset) => ({
      ...offset,
      [axis]: Math.max(-1920, Math.min(1920, offset[axis] + delta)),
    }));
  };

  const exportCurrent = async () => {
    if (screenshots.length === 0 || !screenshots[activeIndex]) return;

    setIsExporting(true);
    try {
      const s = screenshots[activeIndex];
      const node = document.getElementById(`export-${s.id}`);
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
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
        zip.file(`mockup-${i + 1}.png`, base64Data, { base64: true });
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      const zipContent = await zip.generateAsync({ type: "blob" });
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
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-y-auto shrink-0">
        <div className="p-6 space-y-8">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Global Settings</h2>
              <label className="flex items-center gap-2 cursor-pointer" title="Apply settings to all slides or only current slide">
                <span className="text-xs font-semibold text-gray-500">Apply to All</span>
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={applyToAll} onChange={(e) => setApplyToAll(e.target.checked)} />
                  <div className={`block w-8 h-4 rounded-full transition-colors ${applyToAll ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-2 h-2 rounded-full transition-transform ${applyToAll ? 'translate-x-4' : ''}`}></div>
                </div>
              </label>
            </div>

            <div className="space-y-3 mb-8">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <ImageIcon size={16} className="text-indigo-500" /> Background
              </label>
              <div className="grid grid-cols-5 gap-3 mb-3">
                {BACKGROUNDS.map((bg, i) => (
                  <button
                    key={i}
                    onClick={() => updateSetting({ background: bg })}
                    className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 ${activeSettings.background === bg ? 'border-indigo-600 scale-110 shadow-md' : 'border-transparent shadow-sm'}`}
                    style={{ background: bg }}
                    title="Select Preset"
                  />
                ))}
              </div>
              <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
                <span className="text-sm font-medium text-gray-700">Custom</span>
                <input
                  type="color"
                  value={activeSettings.background.startsWith('#') ? activeSettings.background.slice(0, 7) : '#ffffff'}
                  onChange={(e) => updateSetting({ background: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent flex-shrink-0"
                  title="Solid Color"
                />
                <input
                  type="text"
                  placeholder="linear-gradient(...)"
                  value={activeSettings.background}
                  onChange={(e) => updateSetting({ background: e.target.value })}
                  className="flex-1 min-w-0 border border-gray-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                  title="CSS Background (Gradient, URL, etc)"
                />
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Layout size={16} className="text-indigo-500" /> Layout
              </label>
              <div className="grid grid-cols-1 gap-2">
                {(['text-top', 'text-bottom', 'centered'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => updateSetting({ layout: l })}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors text-left ${activeSettings.layout === l ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {l.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </button>
                ))}
              </div>
              <div className="flex bg-gray-100 p-1 rounded-lg mt-2">
                <button
                  onClick={() => { updateSetting({ textAlign: 'left' }); updateCurrentScreenshot({ textOffset: { ...screenshots[activeIndex].textOffset, x: 0 } }); }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeSettings.textAlign === 'left' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Left
                </button>
                <button
                  onClick={() => { updateSetting({ textAlign: 'center' }); updateCurrentScreenshot({ textOffset: { ...screenshots[activeIndex].textOffset, x: 0 } }); }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeSettings.textAlign === 'center' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Center
                </button>
                <button
                  onClick={() => { updateSetting({ textAlign: 'right' }); updateCurrentScreenshot({ textOffset: { ...screenshots[activeIndex].textOffset, x: 0 } }); }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeSettings.textAlign === 'right' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Right
                </button>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Smartphone size={16} className="text-indigo-500" /> Phone Position
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  onClick={() => updateSetting({ phonePositionMode: 'centered' })}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${activeSettings.phonePositionMode === 'centered' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  Centered Y
                </button>
                <button
                  onClick={() => updateSetting({ phonePositionMode: 'half-down' })}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${activeSettings.phonePositionMode === 'half-down' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  Half Down Y
                </button>
              </div>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => { updateSetting({ deviceAlign: 'left' }); updateCurrentScreenshot({ deviceOffset: { ...screenshots[activeIndex].deviceOffset, x: 0 } }); }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeSettings.deviceAlign === 'left' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Left
                </button>
                <button
                  onClick={() => { updateSetting({ deviceAlign: 'center' }); updateCurrentScreenshot({ deviceOffset: { ...screenshots[activeIndex].deviceOffset, x: 0 } }); }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeSettings.deviceAlign === 'center' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Center
                </button>
                <button
                  onClick={() => { updateSetting({ deviceAlign: 'right' }); updateCurrentScreenshot({ deviceOffset: { ...screenshots[activeIndex].deviceOffset, x: 0 } }); }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeSettings.deviceAlign === 'right' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Right
                </button>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Smartphone size={16} className="text-indigo-500" /> Device Frame
              </label>
              <label className="flex items-center cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={activeSettings.deviceFrame}
                    onChange={(e) => updateSetting({ deviceFrame: e.target.checked })}
                  />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${activeSettings.deviceFrame ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${activeSettings.deviceFrame ? 'translate-x-4' : ''}`}></div>
                </div>
                <span className="ml-3 text-sm font-medium text-gray-700">{activeSettings.deviceFrame ? 'Enabled' : 'Disabled'}</span>
              </label>
            </div>

            <div className="space-y-3 mb-8">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Smartphone size={16} className="text-indigo-500" /> Device Scale ({activeSettings.deviceScale}%)
              </label>
              <input
                type="range"
                min={50}
                max={100}
                value={activeSettings.deviceScale}
                onChange={(e) => updateSetting({ deviceScale: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            <div className="space-y-3 mb-8">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Smartphone size={16} className="text-indigo-500" /> Device Border ({activeSettings.deviceBorder}px)
              </label>
              <input
                type="range"
                min={0}
                max={40}
                value={activeSettings.deviceBorder}
                onChange={(e) => updateSetting({ deviceBorder: Number(e.target.value) })}
                className="w-full"
                disabled={!activeSettings.deviceFrame}
              />
            </div>

            <div className="space-y-3 mb-8">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <ImageIcon size={16} className="text-indigo-500" /> Image Fit
              </label>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => updateSetting({ imageFit: 'cover' })}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${activeSettings.imageFit === 'cover' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Cover
                </button>
                <button
                  onClick={() => updateSetting({ imageFit: 'contain' })}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${activeSettings.imageFit === 'contain' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Contain
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Type size={16} className="text-indigo-500" /> Typography Colors
              </label>
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                <span className="text-sm font-medium text-gray-700">Title Color</span>
                <input type="color" value={activeSettings.titleColor} onChange={(e) => updateSetting({ titleColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent" />
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                <span className="text-sm font-medium text-gray-700">Accent Color</span>
                <input type="color" value={activeSettings.accentColor} onChange={(e) => updateSetting({ accentColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent" />
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                <span className="text-sm font-medium text-gray-700">Subtitle Color</span>
                <input type="color" value={activeSettings.subtitleColor} onChange={(e) => updateSetting({ subtitleColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent" />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Type size={16} className="text-indigo-500" /> Fonts
              </label>
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Title Font</span>
                <select value={activeSettings.titleFontFamily} onChange={(e) => updateSetting({ titleFontFamily: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
                  {FONT_OPTIONS.map((font) => <option key={`title-${font.value}`} value={font.value}>{font.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subtitle Font</span>
                <select value={activeSettings.subtitleFontFamily} onChange={(e) => updateSetting({ subtitleFontFamily: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
                  {FONT_OPTIONS.map((font) => <option key={`subtitle-${font.value}`} value={font.value}>{font.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Title Size ({activeSettings.titleFontSize}px)</span>
                <input type="range" min={32} max={160} value={activeSettings.titleFontSize} onChange={(e) => updateSetting({ titleFontSize: Number(e.target.value) })} className="w-full" />
              </div>
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subtitle Size ({activeSettings.subtitleFontSize}px)</span>
                <input type="range" min={16} max={80} value={activeSettings.subtitleFontSize} onChange={(e) => updateSetting({ subtitleFontSize: Number(e.target.value) })} className="w-full" />
              </div>
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Text Spacing ({activeSettings.textSpacing}px)</span>
                <input type="range" min={0} max={120} value={activeSettings.textSpacing} onChange={(e) => updateSetting({ textSpacing: Number(e.target.value) })} className="w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Title Weight</span>
                  <select value={activeSettings.titleFontWeight} onChange={(e) => updateSetting({ titleFontWeight: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white">
                    {[500, 600, 700, 800, 900].map((weight) => <option key={`title-weight-${weight}`} value={weight}>{weight}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subtitle Weight</span>
                  <select value={activeSettings.subtitleFontWeight} onChange={(e) => updateSetting({ subtitleFontWeight: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white">
                    {[400, 500, 600, 700].map((weight) => <option key={`subtitle-weight-${weight}`} value={weight}>{weight}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10">
          <h1 className="text-lg font-bold text-gray-800">Mockup Generator</h1>
          <div className="flex items-center gap-3">
            {screenshots.length > 0 && (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 mr-2">
                <button onClick={() => setZoomScale((z) => Math.max(0.08, z - 0.03))} className="p-1.5 rounded hover:bg-white text-gray-600" title="Zoom out"><ZoomOut size={16} /></button>
                <input type="range" min={0.08} max={1.1} step={0.01} value={zoomScale} onChange={(e) => setZoomScale(Number(e.target.value))} className="w-28" />
                <button onClick={() => setZoomScale((z) => Math.min(1.1, z + 0.03))} className="p-1.5 rounded hover:bg-white text-gray-600" title="Zoom in"><ZoomIn size={16} /></button>
                <button onClick={() => setZoomScale(fitScale)} className="text-xs font-semibold px-2 py-1 rounded bg-white border border-gray-200 text-gray-700 hover:border-indigo-300" title="Fit to viewport">Fit</button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button onClick={exportCurrent} disabled={screenshots.length === 0 || isExporting} className={`px-3 py-2 text-sm rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm ${screenshots.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:shadow-md active:scale-95'}`}>
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                Export Current
              </button>
              <button onClick={exportAll} disabled={screenshots.length === 0 || isExporting} className={`px-3 py-2 text-sm rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm ${screenshots.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:shadow-md active:scale-95'}`}>
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Export All (PNGs)
              </button>
              <button onClick={exportZip} disabled={screenshots.length === 0 || isExporting} className={`px-4 py-2 text-sm rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm ${screenshots.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md active:scale-95'}`}>
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
                Export All (ZIP)
              </button>
            </div>
          </div>
        </div>

        <div
          className={`flex-1 overflow-auto relative p-8 transition-colors ${isFileDragging ? 'bg-indigo-50' : 'bg-gray-100'}`}
          ref={containerRef}
          onDragOver={(e) => { e.preventDefault(); setIsFileDragging(true); }}
          onDragLeave={() => setIsFileDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsFileDragging(false);
            if (e.dataTransfer.files) {
              const filesArray = Array.from(e.dataTransfer.files as FileList);
              addImages(filesArray.filter(f => f.type.startsWith('image/')));
            }
          }}
        >
          <div className="min-h-full min-w-full flex items-center justify-center">
            {screenshots.length > 0 ? (
              <div
                className="shadow-2xl rounded-lg overflow-hidden transition-transform duration-200 map-wrapper shrink-0"
                style={{ width: 1080 * zoomScale, height: 1920 * zoomScale }}
              >
                <div style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top left', width: 1080, height: 1920 }}>
                  <MockupTemplate screenshot={screenshots[activeIndex]} settings={activeSettings} draggingTarget={draggingTarget} onStartDrag={dragMode ? handleStartDrag : undefined} />
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 flex flex-col items-center max-w-md pointer-events-none">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-6"><ImageIcon size={48} className="text-gray-400" /></div>
                <h2 className="text-2xl font-bold text-gray-700 mb-2">Create Professional Mockups</h2>
                <p className="text-gray-500 mb-8">Upload your app screenshots to instantly generate beautiful, Play Store ready mockups. Drag & drop works anywhere!</p>
                <label className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold cursor-pointer pointer-events-auto hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl flex items-center gap-3">
                  <Plus size={24} /> Upload Screenshots
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            )}
          </div>
        </div>

        {screenshots.length > 0 && (
          <div className="h-36 bg-white border-t border-gray-200 flex items-center px-6 gap-4 overflow-x-auto shrink-0 z-10">
            {screenshots.map((s, i) => (
              <div key={s.id} onClick={() => setActiveIndex(i)} className={`relative h-24 w-16 flex-shrink-0 rounded-lg overflow-hidden cursor-pointer border-2 transition-all group ${i === activeIndex ? 'border-indigo-600 shadow-md scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                <img src={s.url} className="w-full h-full object-cover" alt="Thumbnail" />
                <button onClick={(e) => { e.stopPropagation(); removeScreenshot(s.id); }} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" title="Remove screenshot">
                  <Trash2 size={12} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] font-bold text-center py-0.5">{i + 1}</div>
              </div>
            ))}
            <label className="h-24 w-16 flex-shrink-0 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-indigo-400 hover:text-indigo-500 transition-colors text-gray-400">
              <Plus size={24} className="mb-1" />
              <span className="text-[10px] font-medium">Add More</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} title="Add More" />
            </label>
          </div>
        )}
      </div>

      {screenshots.length > 0 && (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-y-auto shrink-0">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Slide Content</h2>
              <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">{activeIndex + 1} / {screenshots.length}</span>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700">Title</label>
              <textarea value={screenshots[activeIndex].title} onChange={(e) => updateCurrentScreenshot({ title: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition-shadow" rows={3} placeholder="Enter title..." />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700">Subtitle</label>
              <textarea value={screenshots[activeIndex].subtitle} onChange={(e) => updateCurrentScreenshot({ subtitle: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition-shadow" rows={4} placeholder="Enter subtitle..." />
            </div>

            <div className="pt-6 border-t border-gray-100 space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <ImageIcon size={16} className="text-indigo-500" /> Slide Actions
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="w-full py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-2 cursor-pointer transition-colors">
                  <ImageIcon size={14} /> Replace
                  <input type="file" accept="image/*" className="hidden" onChange={handleScreenshotReplace} />
                </label>
                <button
                  onClick={duplicateScreenshot}
                  className="w-full py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <Copy size={14} /> Duplicate
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Move size={16} className="text-indigo-500" /> Drag & Position</label>
              <label className="flex items-center cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={dragMode} onChange={(e) => setDragMode(e.target.checked)} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${dragMode ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${dragMode ? 'translate-x-4' : ''}`}></div>
                </div>
                <span className="ml-3 text-sm font-medium text-gray-700">{dragMode ? 'Drag mode enabled' : 'Enable drag mode'}</span>
              </label>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <button onClick={() => nudgeCurrent('text', 'x', -10)} className="px-2 py-2 rounded border border-gray-200 hover:bg-gray-50">Text Left</button>
                <button onClick={() => nudgeCurrent('text', 'x', 10)} className="px-2 py-2 rounded border border-gray-200 hover:bg-gray-50">Text Right</button>
                <button onClick={() => nudgeCurrent('device', 'y', -10)} className="px-2 py-2 rounded border border-gray-200 hover:bg-gray-50">Device Up</button>
                <button onClick={() => nudgeCurrent('device', 'y', 10)} className="px-2 py-2 rounded border border-gray-200 hover:bg-gray-50">Device Down</button>
              </div>

              <button onClick={resetCurrentPosition} className="w-full py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-2">
                <LocateFixed size={14} /> Reset Position
              </button>
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-between">
              <button onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))} disabled={activeIndex === 0} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Previous Slide"><ChevronLeft size={20} /></button>
              <button onClick={() => setActiveIndex(Math.min(screenshots.length - 1, activeIndex + 1))} disabled={activeIndex === screenshots.length - 1} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Next Slide"><ChevronRight size={20} /></button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed top-0 left-0 pointer-events-none" style={{ zIndex: -10, opacity: 0.001 }}>
        {screenshots.map((s) => (
          <div key={`export-${s.id}`}>
            <MockupTemplate id={`export-${s.id}`} screenshot={s} settings={{ ...settings, ...s.settingsOverrides }} />
          </div>
        ))}
      </div>
    </div>
  );
}
