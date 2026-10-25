import { useRef } from 'react';
import { ImagePlus, RectangleHorizontal, RectangleVertical, Trash2, Upload } from 'lucide-react';
import { DEVICE_MODELS, resolveDeviceModel } from '../../devices/catalog';
import type { DeviceElement, OutputSpec } from '../../model/types';
import { useEditor } from '../../store/editorStore';
import { readImageFile } from '../../store/persistence';
import { ColorField, Field, Section, Segmented, Select, SliderField, Toggle, Tooltip } from '../../ui';
import { PositionSection, ShadowSection, type Update } from './common';

const TILT_PRESETS: Array<{ id: string; label: string; tiltX: number; tiltY: number; rotation: number }> = [
  { id: 'flat', label: 'Flat', tiltX: 0, tiltY: 0, rotation: 0 },
  { id: 'left', label: 'Left', tiltX: 4, tiltY: 18, rotation: 0 },
  { id: 'right', label: 'Right', tiltX: 4, tiltY: -18, rotation: 0 },
  { id: 'lean', label: 'Lean', tiltX: 0, tiltY: 0, rotation: -8 },
  { id: 'hero', label: 'Hero', tiltX: 12, tiltY: -22, rotation: 4 },
];

const FAMILY_LABEL: Record<string, string> = {
  iphone: 'iPhone', ipad: 'iPad', 'android-phone': 'Android', 'android-tablet': 'Android tablet', mac: 'Mac', web: 'Web',
};

export function DeviceInspector({ element, output, update, slideId }: { element: DeviceElement; output: OutputSpec; update: Update; slideId: string }) {
  const model = resolveDeviceModel(element.model, output.family);
  const asset = useEditor((state) => (element.screen.assetId ? state.project.assets[element.screen.assetId] : undefined));
  const inputRef = useRef<HTMLInputElement>(null);
  const screen = element.screen;

  const modelOptions = [
    { value: 'auto', label: `Auto · ${model.name}`, description: 'Matches each export size' },
    ...DEVICE_MODELS.map((item) => ({ value: item.id, label: item.name, description: FAMILY_LABEL[item.family] })),
  ];
  const finishes = model.finishes;
  const activeFinish = finishes.find((finish) => finish.id === element.finish) ?? finishes[0];

  return (
    <>
      <Section title="Screenshot">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="group relative flex h-[92px] w-[44px] shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-[#232326] text-zinc-500 transition-colors hover:border-indigo-400/60"
            title="Replace screenshot"
          >
            {asset ? <img src={asset.src} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={16} />}
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <Upload size={14} className="text-white" />
            </span>
          </button>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
            <div className="truncate text-[12px] font-medium text-zinc-200">{asset?.name ?? 'No screenshot yet'}</div>
            <div className="text-[11px] text-zinc-500">{asset ? `${asset.width} × ${asset.height}` : 'Drop an image on the device or click to upload'}</div>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => inputRef.current?.click()} className="h-7 rounded-md bg-white/[0.06] px-2.5 text-[12px] font-medium text-zinc-200 hover:bg-white/10">
                {asset ? 'Replace' : 'Upload'}
              </button>
              {asset && (
                <Tooltip content="Remove screenshot">
                  <button type="button" aria-label="Remove screenshot" onClick={() => update((draft) => { if (draft.type === 'device') draft.screen.assetId = null; }, 'screen-remove', 'content')} className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-red-500/10 hover:text-red-300">
                    <Trash2 size={13} />
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Segmented fullWidth size="sm" value={screen.fit} onChange={(fit) => update({ screen: { ...screen, fit } } as Partial<DeviceElement>, 'screen-fit')} options={[{ value: 'cover', label: 'Fill' }, { value: 'contain', label: 'Fit' }]} />
          <Segmented fullWidth size="sm" value={screen.position} onChange={(position) => update({ screen: { ...screen, position } } as Partial<DeviceElement>, 'screen-position')} options={[{ value: 'top', label: 'Top' }, { value: 'center', label: 'Mid' }, { value: 'bottom', label: 'End' }]} />
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            const image = await readImageFile(file);
            const store = useEditor.getState();
            const assetId = store.addAsset({ name: file.name, ...image });
            store.setDeviceScreenshot(slideId, element.id, assetId);
          }}
        />
      </Section>

      <Section title="Device">
        <Select value={element.model} options={modelOptions} onChange={(value) => update({ model: value, finish: 'default' }, 'model')} />
        <Segmented
          fullWidth
          size="sm"
          value={element.style}
          onChange={(style) => update({ style }, 'style')}
          options={[
            { value: 'real', label: 'Real' },
            { value: 'clay', label: 'Clay' },
            { value: 'matte', label: 'Matte' },
            { value: 'outline', label: 'Line' },
            { value: 'none', label: 'None' },
          ]}
        />
        {element.style === 'real' && (
          <Field label="Finish">
            <div className="flex flex-wrap items-center gap-1.5">
              {finishes.map((finish) => (
                <Tooltip key={finish.id} content={finish.name}>
                  <button
                    type="button"
                    aria-label={finish.name}
                    onClick={() => update({ finish: finish.id }, 'finish')}
                    className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${activeFinish.id === finish.id ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-zinc-900' : 'ring-1 ring-white/15'}`}
                    style={{ background: `linear-gradient(135deg, ${finish.highlight} 0%, ${finish.body} 45%, ${finish.shadow} 100%)` }}
                  />
                </Tooltip>
              ))}
            </div>
          </Field>
        )}
        {(element.style === 'clay' || element.style === 'matte' || element.style === 'outline') && (
          <Field label={element.style === 'outline' ? 'Line' : 'Color'}>
            <ColorField value={element.tint} allowAlpha={false} onChange={(tint) => update({ tint }, 'tint')} />
          </Field>
        )}
        <div className="flex items-center gap-2">
          <Segmented
            value={element.orientation}
            onChange={(orientation) => update({ orientation }, 'orientation')}
            options={[
              { value: 'portrait', icon: <RectangleVertical size={14} />, title: 'Portrait' },
              { value: 'landscape', icon: <RectangleHorizontal size={14} />, title: 'Landscape' },
            ]}
          />
          <label className="ml-auto flex items-center gap-2 text-[12px] text-zinc-400">
            Buttons
            <Toggle checked={element.showButtons} onChange={(showButtons) => update({ showButtons }, 'buttons')} />
          </label>
        </div>
        <SliderField label="Size" value={Math.round(element.h * 100)} min={10} max={140} step={1} unit="%" defaultValue={72} onChange={(value) => update({ h: value / 100 }, 'size', 'content')} />
      </Section>

      <Section title="3D & light">
        <div className="grid grid-cols-5 gap-1">
          {TILT_PRESETS.map((preset) => {
            const active = element.tiltX === preset.tiltX && element.tiltY === preset.tiltY && element.rotation === preset.rotation;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => update({ tiltX: preset.tiltX, tiltY: preset.tiltY, rotation: preset.rotation }, 'tilt-preset', 'content')}
                className={`flex h-12 flex-col items-center justify-center gap-1 rounded-md text-[10px] font-medium transition-colors ${active ? 'bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-400/50' : 'bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-100'}`}
              >
                <span
                  className="block h-5 w-3 rounded-[3px] border border-current"
                  style={{ transform: `perspective(40px) rotateX(${preset.tiltX}deg) rotateY(${preset.tiltY}deg) rotate(${preset.rotation}deg)` }}
                />
                {preset.label}
              </button>
            );
          })}
        </div>
        <SliderField label="Tilt X" value={element.tiltX} min={-45} max={45} step={1} unit="°" defaultValue={0} onChange={(tiltX) => update({ tiltX }, 'tilt-x', 'content')} />
        <SliderField label="Tilt Y" value={element.tiltY} min={-45} max={45} step={1} unit="°" defaultValue={0} onChange={(tiltY) => update({ tiltY }, 'tilt-y', 'content')} />
        <SliderField label="Depth" value={element.perspective} min={600} max={4000} step={50} defaultValue={2400} onChange={(perspective) => update({ perspective }, 'perspective')} />
        <SliderField label="Glare" value={Math.round(element.glare * 100)} min={0} max={100} step={1} unit="%" defaultValue={0} onChange={(value) => update({ glare: value / 100 }, 'glare')} />
      </Section>

      <ShadowSection shadow={element.shadow} onChange={(shadow, key) => update({ shadow }, key)} />
      <PositionSection element={element} output={output} update={update} />
    </>
  );
}
