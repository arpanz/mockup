import { useMemo, useRef, useState } from 'react';
import { Copy, ImagePlus, Plus, RotateCcw, Shuffle, Trash2 } from 'lucide-react';
import { BACKGROUND_PRESETS, type BackgroundPreset } from '../../backgrounds/presets';
import { BackgroundThumb } from '../../backgrounds/BackgroundThumb';
import { PATTERN_REGISTRY, getPattern } from '../../backgrounds/patterns';
import type { Background, MeshPoint, OutputSpec, Paint, Slide } from '../../model/types';
import { useEditor } from '../../store/editorStore';
import { readImageFile } from '../../store/persistence';
import { SetLayoutSection } from './SetLayoutSection';
import { BrandColorSection } from './BrandColorSection';
import { LayoutSection } from './LayoutSection';
import { Button, ColorField, Field, PaintField, Section, Segmented, Select, SliderField, TextInput, Toggle, Tooltip } from '../../ui';

type Kind = Background['kind'];

const KIND_OPTIONS: Array<{ value: Kind; label: string }> = [
  { value: 'solid', label: 'Solid' },
  { value: 'linear', label: 'Linear' },
  { value: 'radial', label: 'Radial' },
  { value: 'mesh', label: 'Mesh' },
  { value: 'pattern', label: 'Pattern' },
  { value: 'image', label: 'Image' },
];

/** Dominant colors of any background, used to carry a palette across kind switches. */
function paletteOf(background: Background): string[] {
  switch (background.kind) {
    case 'solid': return [background.color];
    case 'linear':
    case 'radial': return background.stops.map((stop) => stop.color);
    case 'mesh': return [background.base, ...background.points.map((point) => point.color)];
    case 'pattern': return [background.base, ...background.colors];
    case 'image': return ['#FFFFFF', '#E0E7FF'];
  }
}

function convert(background: Background, kind: Kind, imageAssetId: string | null): Background {
  const colors = paletteOf(background);
  const a = colors[0] ?? '#EEF2FF';
  const b = colors[1] ?? colors[0] ?? '#FFFFFF';
  const noise = background.noise;
  switch (kind) {
    case 'solid': return { kind, color: a, noise };
    case 'linear': return { kind, angle: 180, stops: [{ color: a, position: 0 }, { color: b, position: 1 }], noise };
    case 'radial': return { kind, cx: 0.5, cy: 0.3, stops: [{ color: b, position: 0 }, { color: a, position: 1 }], noise };
    case 'mesh': return {
      kind,
      base: a,
      points: [
        { x: 0.15, y: 0.1, color: b, radius: 0.55 },
        { x: 0.9, y: 0.35, color: colors[2] ?? '#C4B5FD', radius: 0.5 },
        { x: 0.3, y: 0.9, color: colors[3] ?? '#99F6E4', radius: 0.6 },
      ],
      noise: noise || 0.08,
    };
    case 'pattern': {
      const pattern = PATTERN_REGISTRY[0];
      return { kind, patternId: pattern.id, base: a, colors: pattern.defaultColors, scale: 1, noise };
    }
    case 'image': return { kind, assetId: imageAssetId ?? '', fit: 'cover', blur: 0, overlay: '#00000000', noise };
  }
}

const toPaint = (background: Background): Paint | null => {
  if (background.kind === 'solid') return { kind: 'solid', color: background.color };
  if (background.kind === 'linear') return { kind: 'linear', angle: background.angle, stops: background.stops };
  if (background.kind === 'radial') return { kind: 'radial', cx: background.cx, cy: background.cy, stops: background.stops };
  return null;
};

const fromPaint = (paint: Paint, noise: number): Background =>
  paint.kind === 'solid' ? { kind: 'solid', color: paint.color, noise } : { ...paint, noise } as Background;

function PresetGrid({ onPick, resolveAsset }: { onPick: (preset: BackgroundPreset) => void; resolveAsset: (id: string) => string | undefined }) {
  const groups = useMemo(() => Array.from(new Set(BACKGROUND_PRESETS.map((preset) => preset.group))), []);
  const [group, setGroup] = useState(groups[0]);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {groups.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setGroup(name)}
            className={`h-6 rounded-full px-2.5 text-[11px] font-medium transition-colors ${group === name ? 'bg-white/[0.12] text-zinc-100' : 'text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200'}`}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {BACKGROUND_PRESETS.filter((preset) => preset.group === group).map((preset) => (
          <Tooltip key={preset.id} content={preset.name}>
            <button type="button" aria-label={preset.name} onClick={() => onPick(preset)} className="overflow-hidden rounded-md ring-1 ring-inset ring-white/10 transition-transform hover:scale-[1.08] hover:ring-white/40">
              <BackgroundThumb background={preset.background} size={36} aspect={1.3} resolveAsset={resolveAsset} />
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

function MeshEditor({ background, onChange }: { background: Extract<Background, { kind: 'mesh' }>; onChange: (next: Background, key: string) => void }) {
  const setPoint = (index: number, patch: Partial<MeshPoint>, key: string) =>
    onChange({ ...background, points: background.points.map((point, i) => (i === index ? { ...point, ...patch } : point)) }, key);
  return (
    <>
      <Field label="Base">
        <ColorField value={background.base} allowAlpha={false} onChange={(base) => onChange({ ...background, base }, 'mesh-base')} />
      </Field>
      {background.points.map((point, index) => (
        <div key={index} className="grid grid-cols-[1fr_72px_24px] items-center gap-1.5">
          <ColorField value={point.color} onChange={(color) => setPoint(index, { color }, `mesh-color-${index}`)} />
          <input
            type="range"
            min={10}
            max={150}
            value={Math.round(point.radius * 100)}
            onChange={(event) => setPoint(index, { radius: Number(event.target.value) / 100 }, `mesh-radius-${index}`)}
            aria-label="Glow size"
          />
          <button
            type="button"
            aria-label="Remove color"
            disabled={background.points.length <= 1}
            onClick={() => onChange({ ...background, points: background.points.filter((_, i) => i !== index) }, 'mesh-remove')}
            className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-white/[0.06] hover:text-red-300 disabled:opacity-30"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <div className="flex gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          icon={<Plus size={13} />}
          disabled={background.points.length >= 7}
          onClick={() => onChange({ ...background, points: [...background.points, { x: Math.random(), y: Math.random(), color: '#F0ABFC', radius: 0.5 }] }, 'mesh-add')}
        >
          Color
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Shuffle size={13} />}
          onClick={() => onChange({
            ...background,
            points: background.points.map((point) => ({ ...point, x: Math.round(Math.random() * 100) / 100, y: Math.round(Math.random() * 100) / 100 })),
          }, 'mesh-shuffle')}
        >
          Shuffle
        </Button>
      </div>
    </>
  );
}

function BackgroundEditor({ background, onChange, resolveAsset }: { background: Background; onChange: (next: Background, key: string) => void; resolveAsset: (id: string) => string | undefined }) {
  const imageInput = useRef<HTMLInputElement>(null);
  const paint = toPaint(background);

  return (
    <>
      <PresetGrid onPick={(preset) => onChange(structuredClone(preset.background), 'preset')} resolveAsset={resolveAsset} />
      <Select value={background.kind} options={KIND_OPTIONS} onChange={(kind) => {
        if (kind === 'image') {
          imageInput.current?.click();
          return;
        }
        onChange(convert(background, kind, null), 'kind');
      }} />
      {paint && <PaintField value={paint} onChange={(next) => onChange(fromPaint(next, background.noise), 'paint')} />}
      {background.kind === 'mesh' && <MeshEditor background={background} onChange={onChange} />}
      {background.kind === 'pattern' && (
        <>
          <Select
            value={background.patternId}
            options={PATTERN_REGISTRY.map((pattern) => ({ value: pattern.id, label: pattern.name }))}
            onChange={(patternId) => onChange({ ...background, patternId, colors: getPattern(patternId)?.defaultColors ?? background.colors }, 'pattern')}
          />
          <Field label="Base">
            <ColorField value={background.base} allowAlpha={false} onChange={(base) => onChange({ ...background, base }, 'pattern-base')} />
          </Field>
          {background.colors.map((color, index) => (
            <Field key={index} label={`Color ${index + 1}`}>
              <ColorField value={color} onChange={(next) => onChange({ ...background, colors: background.colors.map((c, i) => (i === index ? next : c)) }, `pattern-color-${index}`)} />
            </Field>
          ))}
          <SliderField label="Scale" value={Math.round(background.scale * 100)} min={30} max={300} step={5} unit="%" defaultValue={100} onChange={(value) => onChange({ ...background, scale: value / 100 }, 'pattern-scale')} />
        </>
      )}
      {background.kind === 'image' && (
        <>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 overflow-hidden rounded-md bg-[#232326] ring-1 ring-white/10">
              {resolveAsset(background.assetId) && <img src={resolveAsset(background.assetId)} alt="" className="h-full w-full object-cover" />}
            </div>
            <Button variant="secondary" size="sm" icon={<ImagePlus size={13} />} onClick={() => imageInput.current?.click()}>Replace</Button>
          </div>
          <Segmented fullWidth size="sm" value={background.fit} onChange={(fit) => onChange({ ...background, fit }, 'image-fit')} options={[{ value: 'cover', label: 'Fill' }, { value: 'contain', label: 'Fit' }]} />
          <SliderField label="Blur" value={background.blur} min={0} max={120} step={1} unit="u" defaultValue={0} onChange={(blur) => onChange({ ...background, blur }, 'image-blur')} />
          <Field label="Tint">
            <ColorField value={background.overlay} onChange={(overlay) => onChange({ ...background, overlay }, 'image-overlay')} />
          </Field>
        </>
      )}
      <SliderField label="Grain" value={Math.round(background.noise * 100)} min={0} max={100} step={1} unit="%" defaultValue={0} onChange={(value) => onChange({ ...background, noise: value / 100 }, 'noise')} />
      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          const image = await readImageFile(file);
          const assetId = useEditor.getState().addAsset({ name: file.name, ...image });
          onChange({ ...convert(background, 'image', assetId), assetId } as Background, 'image');
        }}
      />
    </>
  );
}

export function SlideInspector({ slide, output }: { slide: Slide; output: OutputSpec }) {
  const span = useEditor((state) => state.project.span);
  const assets = useEditor((state) => state.project.assets);
  const store = useEditor.getState;
  const resolveAsset = (id: string) => assets[id]?.src;
  const overrideCount = Object.keys(slide.overrides[output.id] ?? {}).length;
  const background = span.enabled ? span.background : slide.background;

  return (
    <>
      <Section title="Screenshot">
        <TextInput value={slide.name} onChange={(event) => store().renameSlide(slide.id, event.target.value)} placeholder="Screenshot name" />
        <div className="flex gap-1.5">
          <Button variant="secondary" size="sm" icon={<Copy size={13} />} onClick={() => store().duplicateSlide(slide.id)}>Duplicate</Button>
          <Button variant="ghost" size="sm" icon={<Trash2 size={13} />} onClick={() => store().removeSlide(slide.id)}>Delete</Button>
        </div>
        {overrideCount > 0 && (
          <div className="flex items-center justify-between rounded-md bg-amber-400/10 px-2.5 py-2 text-[12px] text-amber-200">
            <span>{overrideCount} layer{overrideCount > 1 ? 's' : ''} customized for {output.label}</span>
            <button type="button" onClick={() => store().clearOverrides(slide.id, output.id)} className="flex items-center gap-1 font-medium hover:text-white">
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        )}
      </Section>

      <LayoutSection />
      <SetLayoutSection />
      <BrandColorSection />

      <Section
        title={span.enabled ? 'Panorama background' : 'Background'}
        actions={(
          <Tooltip content="One continuous background across all screenshots — devices can straddle the seams">
            <label className="flex items-center gap-1.5 text-[11px] font-medium normal-case tracking-normal text-zinc-400">
              Panorama
              <Toggle checked={span.enabled} onChange={(enabled) => store().setSpan({ enabled, background: enabled ? slide.background : span.background })} />
            </label>
          </Tooltip>
        )}
      >
        <BackgroundEditor
          background={background}
          resolveAsset={resolveAsset}
          onChange={(next, key) => {
            if (span.enabled) store().setSpan({ background: next }, { coalesce: `span-${key}` });
            else store().setBackground(slide.id, next, { coalesce: `bg-${slide.id}-${key}` });
          }}
        />
        {!span.enabled && (
          <Button variant="secondary" size="sm" onClick={() => store().setBackground(slide.id, slide.background, { allSlides: true })}>
            Apply to all screenshots
          </Button>
        )}
      </Section>
    </>
  );
}
