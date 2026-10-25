import { createContext, useContext, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react';
import { ArrowLeftRight, Pipette, Trash2 } from 'lucide-react';
import type { GradientStop, Paint } from '../model/types';
import { NumberField, Popover, Segmented, cn, usePopover } from './controls';

/* ───────────────────────── Color math ───────────────────────── */

export interface RGBA { r: number; g: number; b: number; a: number }
export interface HSVA { h: number; s: number; v: number; a: number }

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function parseHex(hex: string): RGBA | null {
  let raw = hex.trim().replace(/^#/, '');
  if (/^[\da-f]{3,4}$/i.test(raw)) raw = raw.split('').map((char) => char + char).join('');
  if (!/^(?:[\da-f]{6}|[\da-f]{8})$/i.test(raw)) return null;
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
    a: raw.length === 8 ? parseInt(raw.slice(6, 8), 16) / 255 : 1,
  };
}

/** `#RRGGBB`, or `#RRGGBBAA` when `alpha` is set and the color is translucent. */
export function formatHex(color: { r: number; g: number; b: number; a?: number }, alpha = false): string {
  const byte = (value: number) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0');
  const tail = alpha && color.a !== undefined && color.a < 0.999 ? byte(color.a * 255) : '';
  return `#${byte(color.r)}${byte(color.g)}${byte(color.b)}${tail}`.toUpperCase();
}

export function hexToRgba(hex: string) {
  const color = parseHex(hex);
  return color ? `rgba(${color.r}, ${color.g}, ${color.b}, ${+color.a.toFixed(3)})` : 'rgba(0, 0, 0, 1)';
}

export function withAlpha(hex: string, alpha: number) {
  const color = parseHex(hex);
  return color ? formatHex({ ...color, a: clamp01(alpha) }, true) : hex;
}

export const alphaOf = (hex: string) => parseHex(hex)?.a ?? 1;
export const opaqueHex = (hex: string) => formatHex(parseHex(hex) ?? { r: 0, g: 0, b: 0 });

export function rgbToHsv({ r, g, b, a }: RGBA): HSVA {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const delta = max - Math.min(rn, gn, bn);
  let h = 0;
  if (delta) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max ? delta / max : 0, v: max, a };
}

export function hsvToRgb({ h, s, v, a }: HSVA): RGBA {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255;
  };
  return { r: f(5), g: f(3), b: f(1), a };
}

export function mixHex(from: string, to: string, t: number) {
  const a = parseHex(from) ?? { r: 0, g: 0, b: 0, a: 1 };
  const b = parseHex(to) ?? a;
  const lerp = (x: number, y: number) => x + (y - x) * t;
  return formatHex({ r: lerp(a.r, b.r), g: lerp(a.g, b.g), b: lerp(a.b, b.b), a: lerp(a.a, b.a) }, true);
}

export function paintToCss(paint: Paint): string {
  if (paint.kind === 'solid') return hexToRgba(paint.color);
  const stops = [...paint.stops]
    .sort((a, b) => a.position - b.position)
    .map((stop) => `${hexToRgba(stop.color)} ${+(stop.position * 100).toFixed(2)}%`)
    .join(', ');
  return paint.kind === 'linear'
    ? `linear-gradient(${paint.angle}deg, ${stops})`
    : `radial-gradient(circle at ${paint.cx * 100}% ${paint.cy * 100}%, ${stops})`;
}

/** Color of a gradient at position t (0..1). */
export function sampleStops(stops: GradientStop[], t: number) {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  if (t <= sorted[0].position) return sorted[0].color;
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const next = sorted[i];
    if (t <= next.position) return mixHex(prev.color, next.color, (t - prev.position) / Math.max(1e-6, next.position - prev.position));
  }
  return sorted[sorted.length - 1].color;
}

export const CHECKERBOARD =
  'repeating-conic-gradient(#3f3f46 0% 25%, #27272a 0% 50%) 0 0 / 8px 8px';

/* ───────────────────────── Swatches (document + recent) ───────────────────────── */

const DocumentColorsContext = createContext<string[]>([]);

/** Supplies colors used in the current document to every picker below it. */
export function DocumentColorsProvider({ colors, children }: { colors: string[]; children: ReactNode }) {
  return <DocumentColorsContext.Provider value={colors}>{children}</DocumentColorsContext.Provider>;
}

const RECENT_KEY = 'frameflow-recent-colors';
const recentListeners = new Set<(colors: string[]) => void>();

function readRecent(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && Boolean(parseHex(item))) : [];
  } catch {
    return [];
  }
}

export function rememberColor(hex: string) {
  if (!parseHex(hex)) return;
  const next = [hex.toUpperCase(), ...readRecent().filter((item) => item.toUpperCase() !== hex.toUpperCase())].slice(0, 16);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: recents just won't persist.
  }
  recentListeners.forEach((listener) => listener(next));
}

function useRecentColors() {
  const [recent, setRecent] = useState(readRecent);
  useEffect(() => {
    recentListeners.add(setRecent);
    return () => { recentListeners.delete(setRecent); };
  }, []);
  return recent;
}

/* ───────────────────────── Pointer-drag helper ───────────────────────── */

/** Calls `onMove` with the pointer position normalized to the element's box (0..1), from down until up. */
function useDrag2D(onMove: (x: number, y: number) => void, onEnd?: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const handlers = {
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const node = ref.current;
      if (!node) return;
      try { node.setPointerCapture(event.pointerId); } catch { /* synthetic pointer */ }
      const emit = (clientX: number, clientY: number) => {
        const rect = node.getBoundingClientRect();
        onMove(clamp01((clientX - rect.left) / rect.width), clamp01((clientY - rect.top) / rect.height));
      };
      emit(event.clientX, event.clientY);
      const move = (e: PointerEvent) => emit(e.clientX, e.clientY);
      const up = () => {
        node.removeEventListener('pointermove', move);
        node.removeEventListener('pointerup', up);
        node.removeEventListener('pointercancel', up);
        onEnd?.();
      };
      node.addEventListener('pointermove', move);
      node.addEventListener('pointerup', up);
      node.addEventListener('pointercancel', up);
    },
  };
  return { ref, handlers };
}

/* ───────────────────────── ColorPicker ───────────────────────── */

function SliderTrack({ background, value, onChange, onEnd, label }: {
  background: string;
  value: number;
  onChange: (value: number) => void;
  onEnd?: () => void;
  label: string;
}) {
  const { ref, handlers } = useDrag2D((x) => onChange(x), onEnd);
  return (
    <div
      ref={ref}
      {...handlers}
      role="slider"
      aria-label={label}
      aria-valuenow={Math.round(value * 100)}
      tabIndex={0}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 0.1 : 0.01;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') { event.preventDefault(); onChange(clamp01(value - step)); }
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') { event.preventDefault(); onChange(clamp01(value + step)); }
      }}
      className="relative h-3 cursor-pointer touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
      style={{ background }}
    >
      <div
        className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.25),0_2px_6px_rgba(0,0,0,0.4)]"
        style={{ left: `${value * 100}%` }}
      />
    </div>
  );
}

function SwatchButton({ color, active, onPick }: { color: string; active?: boolean; onPick: (color: string) => void }) {
  return (
    <button
      type="button"
      title={color}
      aria-label={`Use ${color}`}
      onClick={() => onPick(color)}
      className={cn(
        'relative h-[22px] w-[22px] overflow-hidden rounded-[5px] ring-1 ring-inset ring-white/15 transition-transform hover:scale-110',
        active && 'ring-2 ring-white',
      )}
      style={{ background: CHECKERBOARD }}
    >
      <span className="absolute inset-0" style={{ background: hexToRgba(color) }} />
    </button>
  );
}

type ColorMode = 'hex' | 'rgb' | 'hsb';

export function ColorPicker({
  value,
  onChange,
  onCommit,
  swatches = [],
  allowAlpha = true,
}: {
  value: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  swatches?: string[];
  allowAlpha?: boolean;
}) {
  // Keep HSV locally so hue/saturation survive passes through black, white and grays.
  const [hsva, setHsva] = useState<HSVA>(() => rgbToHsv(parseHex(value) ?? { r: 255, g: 255, b: 255, a: 1 }));
  const emitted = useRef(value);
  const [mode, setMode] = useState<ColorMode>('hex');
  const [hexDraft, setHexDraft] = useState(value.replace(/^#/, '').slice(0, 6));
  const documentColors = useContext(DocumentColorsContext);
  const recent = useRecentColors();

  useEffect(() => {
    if (value.toUpperCase() === emitted.current.toUpperCase()) return;
    const parsed = parseHex(value);
    if (parsed) setHsva(rgbToHsv(parsed));
    emitted.current = value;
    setHexDraft(value.replace(/^#/, '').slice(0, 6));
  }, [value]);

  const emit = (next: HSVA) => {
    const normalized = allowAlpha ? next : { ...next, a: 1 };
    setHsva(normalized);
    const hex = formatHex(hsvToRgb(normalized), allowAlpha);
    emitted.current = hex;
    setHexDraft(hex.replace(/^#/, '').slice(0, 6));
    onChange(hex);
  };
  const commit = () => {
    rememberColor(emitted.current);
    onCommit?.(emitted.current);
  };
  const pick = (hex: string) => {
    const parsed = parseHex(hex);
    if (!parsed) return;
    emit(rgbToHsv(allowAlpha ? parsed : { ...parsed, a: 1 }));
    commit();
  };

  const sv = useDrag2D((x, y) => emit({ ...hsva, s: x, v: 1 - y }), commit);
  const rgb = hsvToRgb(hsva);
  const pureHue = formatHex(hsvToRgb({ h: hsva.h, s: 1, v: 1, a: 1 }));
  const opaque = formatHex(rgb);

  const eyeDropperSupported = typeof window !== 'undefined' && 'EyeDropper' in window;
  const sampleScreen = async () => {
    try {
      const EyeDropperCtor = (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
      const result = await new EyeDropperCtor().open();
      pick(formatHex({ ...(parseHex(result.sRGBHex) ?? rgb), a: hsva.a }, allowAlpha));
    } catch {
      // Cancelled with Esc.
    }
  };

  const groups = [
    { label: 'Document', colors: Array.from(new Set([...swatches, ...documentColors].map((c) => c.toUpperCase()))).slice(0, 16) },
    { label: 'Recent', colors: recent },
  ].filter((group) => group.colors.length > 0);

  const channelField = (label: string, val: number, max: number, apply: (n: number) => void) => (
    <NumberField key={label} icon={label} value={Math.round(val)} min={0} max={max} onChange={apply} onCommit={commit} />
  );

  return (
    <div className="flex w-[244px] flex-col gap-3 p-3">
      <div
        ref={sv.ref}
        {...sv.handlers}
        className="relative h-[152px] cursor-crosshair touch-none overflow-hidden rounded-lg"
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${pureHue})` }}
      >
        <div
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_6px_rgba(0,0,0,0.35)]"
          style={{ left: `${hsva.s * 100}%`, top: `${(1 - hsva.v) * 100}%`, background: opaque }}
        />
      </div>

      <div className="flex items-center gap-2.5">
        {eyeDropperSupported && (
          <button
            type="button"
            onClick={() => void sampleScreen()}
            title="Pick a color from the screen"
            aria-label="Pick a color from the screen"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-zinc-100"
          >
            <Pipette size={15} />
          </button>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <SliderTrack
            label="Hue"
            value={hsva.h / 360}
            onChange={(x) => emit({ ...hsva, h: Math.min(359.9, x * 360) })}
            onEnd={commit}
            background="linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)"
          />
          {allowAlpha && (
            <SliderTrack
              label="Opacity"
              value={hsva.a}
              onChange={(x) => emit({ ...hsva, a: Math.round(x * 100) / 100 })}
              onEnd={commit}
              background={`linear-gradient(to right, transparent, ${opaque}), ${CHECKERBOARD}`}
            />
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <select
          aria-label="Color format"
          value={mode}
          onChange={(event) => setMode(event.target.value as ColorMode)}
          className="h-7 shrink-0 cursor-pointer rounded-md border-0 bg-transparent pl-1 pr-0 text-[11px] font-medium uppercase text-zinc-400 outline-none hover:text-zinc-200"
        >
          <option value="hex">Hex</option>
          <option value="rgb">RGB</option>
          <option value="hsb">HSB</option>
        </select>
        {mode === 'hex' && (
          <input
            aria-label="Hex color"
            value={hexDraft}
            maxLength={6}
            spellCheck={false}
            onChange={(event) => {
              const next = event.target.value.replace(/[^\da-f]/gi, '').toUpperCase();
              setHexDraft(next);
              const parsed = next.length === 6 || next.length === 3 ? parseHex(next) : null;
              if (parsed) emit(rgbToHsv({ ...parsed, a: hsva.a }));
            }}
            onBlur={() => { setHexDraft(opaque.slice(1)); commit(); }}
            onKeyDown={(event) => event.key === 'Enter' && (event.target as HTMLInputElement).blur()}
            className="h-7 min-w-0 flex-1 rounded-md border border-white/10 bg-[#232326] px-2 font-mono text-[12px] uppercase text-zinc-100 outline-none focus:border-indigo-500/70"
          />
        )}
        {mode === 'rgb' && (
          <div className="grid min-w-0 flex-1 grid-cols-3 gap-1">
            {channelField('R', rgb.r, 255, (r) => emit(rgbToHsv({ ...rgb, r })))}
            {channelField('G', rgb.g, 255, (g) => emit(rgbToHsv({ ...rgb, g })))}
            {channelField('B', rgb.b, 255, (b) => emit(rgbToHsv({ ...rgb, b })))}
          </div>
        )}
        {mode === 'hsb' && (
          <div className="grid min-w-0 flex-1 grid-cols-3 gap-1">
            {channelField('H', hsva.h, 360, (h) => emit({ ...hsva, h: Math.min(359.9, h) }))}
            {channelField('S', hsva.s * 100, 100, (s) => emit({ ...hsva, s: s / 100 }))}
            {channelField('B', hsva.v * 100, 100, (v) => emit({ ...hsva, v: v / 100 }))}
          </div>
        )}
        {allowAlpha && (
          <div className="w-[62px] shrink-0">
            <NumberField value={Math.round(hsva.a * 100)} min={0} max={100} unit="%" onChange={(a) => emit({ ...hsva, a: a / 100 })} onCommit={commit} />
          </div>
        )}
      </div>

      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5">
          <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-zinc-500">{group.label}</span>
          <div className="flex flex-wrap gap-[5px]">
            {group.colors.map((color) => (
              <SwatchButton key={`${group.label}-${color}`} color={color} active={color.toUpperCase() === value.toUpperCase()} onPick={pick} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── ColorField ───────────────────────── */

export function ColorSwatch({ color, size = 18, className }: { color: string; size?: number; className?: string }) {
  return (
    <span
      className={cn('relative inline-block shrink-0 overflow-hidden rounded-[4px] ring-1 ring-inset ring-white/15', className)}
      style={{ width: size, height: size, background: CHECKERBOARD }}
    >
      <span className="absolute inset-0" style={{ background: hexToRgba(color) }} />
    </span>
  );
}

export function ColorField({
  value,
  onChange,
  onCommit,
  allowAlpha = true,
  swatches = [],
}: {
  value: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  allowAlpha?: boolean;
  swatches?: string[];
}) {
  const popover = usePopover();
  const [draft, setDraft] = useState(value.replace(/^#/, '').slice(0, 6));
  const [focused, setFocused] = useState(false);
  const focusValue = useRef(value);
  useEffect(() => {
    if (!focused) setDraft(value.replace(/^#/, '').slice(0, 6));
  }, [value, focused]);
  const alpha = alphaOf(value);

  return (
    <div
      ref={popover.anchorRef as RefObject<HTMLDivElement>}
      className={cn(
        'flex h-8 w-full min-w-0 items-center gap-2 rounded-md border bg-[#232326] pl-1.5 pr-1 transition-colors',
        popover.open ? 'border-indigo-500/70' : 'border-white/10 hover:border-white/20 focus-within:border-indigo-500/70',
      )}
    >
      <button type="button" aria-label="Open color picker" onClick={popover.toggle} className="flex shrink-0 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70">
        <ColorSwatch color={value} size={20} />
      </button>
      <input
        aria-label="Hex color"
        value={draft}
        maxLength={6}
        spellCheck={false}
        onFocus={(event) => { setFocused(true); focusValue.current = value; event.target.select(); }}
        onChange={(event) => {
          const next = event.target.value.replace(/[^\da-f]/gi, '').toUpperCase();
          setDraft(next);
          const parsed = next.length === 6 || next.length === 3 ? parseHex(next) : null;
          if (parsed) onChange(formatHex({ ...parsed, a: alpha }, allowAlpha));
        }}
        onBlur={() => {
          setFocused(false);
          setDraft(value.replace(/^#/, '').slice(0, 6));
          if (value.toUpperCase() === focusValue.current.toUpperCase()) return;
          rememberColor(value);
          onCommit?.(value);
        }}
        onKeyDown={(event) => event.key === 'Enter' && (event.target as HTMLInputElement).blur()}
        className="h-full min-w-0 flex-1 bg-transparent font-mono text-[12px] uppercase tracking-wide text-zinc-100 outline-none"
      />
      {allowAlpha && (
        <div className="w-[68px] shrink-0 border-l border-white/[0.07] pl-1">
          <NumberField
            value={Math.round(alpha * 100)}
            min={0}
            max={100}
            unit="%"
            onChange={(next) => onChange(withAlpha(value, next / 100))}
            onCommit={() => onCommit?.(value)}
          />
        </div>
      )}
      <Popover open={popover.open} onOpenChange={popover.setOpen} anchor={popover.anchorRef} side="left" align="start" offset={12}>
        <ColorPicker value={value} onChange={onChange} onCommit={onCommit} swatches={swatches} allowAlpha={allowAlpha} />
      </Popover>
    </div>
  );
}

/* ───────────────────────── Gradient editor ───────────────────────── */

function AngleDial({ value, onChange }: { value: number; onChange: (angle: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node) return;
    event.preventDefault();
    try { node.setPointerCapture(event.pointerId); } catch { /* synthetic pointer */ }
    const emit = (clientX: number, clientY: number, snap: boolean) => {
      const rect = node.getBoundingClientRect();
      // CSS gradient angles: 0deg points up, increasing clockwise.
      let angle = (Math.atan2(clientX - (rect.left + rect.width / 2), -(clientY - (rect.top + rect.height / 2))) * 180) / Math.PI;
      angle = (angle + 360) % 360;
      onChange(snap ? Math.round(angle / 15) * 15 % 360 : Math.round(angle));
    };
    emit(event.clientX, event.clientY, event.shiftKey);
    const move = (e: PointerEvent) => emit(e.clientX, e.clientY, e.shiftKey);
    const up = () => {
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
    };
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', up);
  };
  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      title="Drag to set the angle (Shift snaps 15°)"
      className="relative h-8 w-8 shrink-0 cursor-grab touch-none rounded-full border border-white/10 bg-[#232326] active:cursor-grabbing"
    >
      <span
        className="pointer-events-none absolute left-1/2 top-1/2 h-[11px] w-[2px] origin-bottom rounded-full bg-indigo-400"
        style={{ transform: `translate(-50%, -100%) rotate(${value}deg)` }}
      />
      <span className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-300" />
    </div>
  );
}

const REMOVE_DISTANCE = 36;

export function GradientEditor({
  stops,
  onChange,
  onCommit,
}: {
  stops: GradientStop[];
  onChange: (stops: GradientStop[]) => void;
  onCommit?: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const [removing, setRemoving] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const index = Math.min(selected, stops.length - 1);
  const stop = stops[index];
  const sortedCss = paintToCss({ kind: 'linear', angle: 90, stops });

  const update = (i: number, patch: Partial<GradientStop>) => onChange(stops.map((item, j) => (j === i ? { ...item, ...patch } : item)));
  const remove = (i: number) => {
    if (stops.length <= 2) return;
    onChange(stops.filter((_, j) => j !== i));
    setSelected(Math.max(0, i - 1));
    onCommit?.();
  };

  const positionAt = (clientX: number) => {
    const rect = barRef.current!.getBoundingClientRect();
    return clamp01((clientX - rect.left) / rect.width);
  };

  const startDrag = (event: ReactPointerEvent<HTMLElement>, i: number) => {
    event.preventDefault();
    event.stopPropagation();
    setSelected(i);
    const target = event.currentTarget;
    try { target.setPointerCapture(event.pointerId); } catch { /* synthetic pointer */ }
    const startY = event.clientY;
    let current = stops;
    let detached = false;
    const move = (e: PointerEvent) => {
      detached = current.length > 2 && Math.abs(e.clientY - startY) > REMOVE_DISTANCE;
      setRemoving(detached ? i : null);
      current = current.map((item, j) => (j === i ? { ...item, position: Math.round(positionAt(e.clientX) * 1000) / 1000 } : item));
      onChange(current);
    };
    const up = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', up);
      setRemoving(null);
      if (detached) {
        onChange(current.filter((_, j) => j !== i));
        setSelected(Math.max(0, i - 1));
      }
      onCommit?.();
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', up);
  };

  const addAt = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const position = Math.round(positionAt(event.clientX) * 1000) / 1000;
    const next = [...stops, { color: sampleStops(stops, position), position }];
    onChange(next);
    setSelected(next.length - 1);
    onCommit?.();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative px-[9px] pb-[14px]">
        <div
          ref={barRef}
          onPointerDown={addAt}
          title="Click to add a color stop"
          className="relative h-6 cursor-copy overflow-hidden rounded-md ring-1 ring-inset ring-white/10"
          style={{ background: `${sortedCss}, ${CHECKERBOARD}` }}
        />
        {stops.map((item, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Color stop ${Math.round(item.position * 100)}%`}
            onPointerDown={(event) => startDrag(event, i)}
            onKeyDown={(event) => {
              if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); remove(i); }
              const step = event.shiftKey ? 0.1 : 0.01;
              if (event.key === 'ArrowLeft') { event.preventDefault(); update(i, { position: clamp01(item.position - step) }); }
              if (event.key === 'ArrowRight') { event.preventDefault(); update(i, { position: clamp01(item.position + step) }); }
            }}
            className={cn(
              'absolute top-[14px] z-[1] flex h-[22px] w-[18px] -translate-x-1/2 cursor-grab touch-none flex-col items-center outline-none transition-opacity active:cursor-grabbing',
              removing === i && 'opacity-30',
            )}
            style={{ left: `calc(9px + (100% - 18px) * ${item.position})` }}
          >
            <span className={cn('h-0 w-0 border-x-[5px] border-b-[5px] border-x-transparent', i === index ? 'border-b-white' : 'border-b-zinc-500')} />
            <span
              className={cn('relative h-[16px] w-[16px] overflow-hidden rounded-[4px] border-2 shadow-[0_2px_6px_rgba(0,0,0,0.5)]', i === index ? 'border-white' : 'border-zinc-500')}
              style={{ background: CHECKERBOARD }}
            >
              <span className="absolute inset-0" style={{ background: hexToRgba(item.color) }} />
            </span>
          </button>
        ))}
      </div>

      {stop && (
        <div className="flex items-center gap-1.5">
          <div className="min-w-0 flex-1">
            <ColorField value={stop.color} onChange={(color) => update(index, { color })} onCommit={onCommit} />
          </div>
          <div className="w-[62px] shrink-0">
            <NumberField value={Math.round(stop.position * 100)} min={0} max={100} unit="%" onChange={(value) => update(index, { position: value / 100 })} onCommit={onCommit} />
          </div>
          <button
            type="button"
            title="Remove stop"
            aria-label="Remove stop"
            disabled={stops.length <= 2}
            onClick={() => remove(index)}
            className="flex h-8 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.08] hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-30"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── PaintField ───────────────────────── */

function toKind(value: Paint, kind: Paint['kind']): Paint {
  if (kind === value.kind) return value;
  if (kind === 'solid') return { kind, color: value.kind === 'solid' ? value.color : value.stops[0].color };
  const stops: GradientStop[] = value.kind === 'solid'
    ? [{ color: value.color, position: 0 }, { color: mixHex(value.color, alphaOf(value.color) > 0.5 && rgbToHsv(parseHex(value.color)!).v > 0.5 ? '#000000' : '#FFFFFF', 0.35), position: 1 }]
    : value.stops;
  return kind === 'linear' ? { kind, angle: 180, stops } : { kind, cx: 0.5, cy: 0.5, stops };
}

export function PaintField({
  value,
  onChange,
  onCommit,
}: {
  value: Paint;
  onChange: (value: Paint) => void;
  onCommit?: (value: Paint) => void;
}) {
  const commit = () => onCommit?.(value);
  return (
    <div className="flex flex-col gap-2.5">
      <Segmented
        fullWidth
        value={value.kind}
        onChange={(kind) => onChange(toKind(value, kind))}
        options={[
          { value: 'solid', label: 'Solid' },
          { value: 'linear', label: 'Linear' },
          { value: 'radial', label: 'Radial' },
        ]}
      />
      {value.kind === 'solid' ? (
        <ColorField value={value.color} onChange={(color) => onChange({ ...value, color })} onCommit={commit} />
      ) : (
        <>
          <GradientEditor stops={value.stops} onChange={(stops) => onChange({ ...value, stops })} onCommit={commit} />
          <div className="flex items-center gap-1.5">
            {value.kind === 'linear' ? (
              <>
                <AngleDial value={value.angle} onChange={(angle) => onChange({ ...value, angle })} />
                <div className="min-w-0 flex-1">
                  <NumberField icon="∠" value={value.angle} min={-360} max={360} unit="°" onChange={(angle) => onChange({ ...value, angle: ((angle % 360) + 360) % 360 })} onCommit={commit} />
                </div>
              </>
            ) : (
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5">
                <NumberField icon="X" value={Math.round(value.cx * 100)} min={-50} max={150} unit="%" onChange={(cx) => onChange({ ...value, cx: cx / 100 })} onCommit={commit} />
                <NumberField icon="Y" value={Math.round(value.cy * 100)} min={-50} max={150} unit="%" onChange={(cy) => onChange({ ...value, cy: cy / 100 })} onCommit={commit} />
              </div>
            )}
            <button
              type="button"
              title="Reverse gradient"
              aria-label="Reverse gradient"
              onClick={() => { onChange({ ...value, stops: value.stops.map((item) => ({ ...item, position: 1 - item.position })) }); commit(); }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.08] hover:text-zinc-100"
            >
              <ArrowLeftRight size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
