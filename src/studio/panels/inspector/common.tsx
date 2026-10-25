import { RotateCw } from 'lucide-react';
import type { Draft } from 'immer';
import type { OutputSpec, Shadow, Stroke, StudioElement } from '../../model/types';
import { elementBox } from '../../render/geometry';
import { AlignButtons, ColorField, Field, NumberField, Section, SliderField, Toggle } from '../../ui';

type Update = (patch: Partial<StudioElement> | ((element: Draft<StudioElement>) => void), key: string, kind?: 'style' | 'content') => void;

const round = (value: number, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;

export function PositionSection({ element, output, update }: { element: StudioElement; output: OutputSpec; update: Update }) {
  const box = elementBox(element, output);
  const halfW = box.width / output.width / 2;
  const halfH = box.height / output.height / 2;
  const margin = 0.05;

  return (
    <Section title="Position">
      <AlignButtons
        onAlign={(axis, where) => {
          if (axis === 'x') {
            const x = where === 'start' ? margin + halfW : where === 'end' ? 1 - margin - halfW : 0.5;
            update({ x }, 'align-x', 'content');
          } else {
            const y = where === 'start' ? margin + halfH : where === 'end' ? 1 - margin - halfH : 0.5;
            update({ y }, 'align-y', 'content');
          }
        }}
      />
      <div className="grid grid-cols-2 gap-2">
        <NumberField icon="X" unit="%" value={round(element.x * 100)} precision={1} step={0.5} onChange={(value) => update({ x: value / 100 }, 'x', 'content')} />
        <NumberField icon="Y" unit="%" value={round(element.y * 100)} precision={1} step={0.5} onChange={(value) => update({ y: value / 100 }, 'y', 'content')} />
        <NumberField icon={<RotateCw size={12} />} unit="°" value={round(element.rotation)} precision={1} min={-180} max={180} onChange={(value) => update({ rotation: value }, 'rotation', 'content')} />
        <NumberField icon="α" unit="%" value={Math.round(element.opacity * 100)} min={0} max={100} onChange={(value) => update({ opacity: value / 100 }, 'opacity')} />
      </div>
    </Section>
  );
}

export function ShadowSection({ shadow, onChange, title = 'Shadow' }: { shadow: Shadow; onChange: (shadow: Shadow, key: string) => void; title?: string }) {
  const set = (patch: Partial<Shadow>, key: string) => onChange({ ...shadow, ...patch }, key);
  return (
    <Section
      title={title}
      defaultOpen={shadow.enabled}
      actions={<Toggle checked={shadow.enabled} onChange={(enabled) => set({ enabled }, 'shadow-enabled')} />}
    >
      {shadow.enabled && (
        <>
          <Field label="Color">
            <ColorField value={shadow.color} allowAlpha={false} onChange={(color) => set({ color }, 'shadow-color')} />
          </Field>
          <SliderField label="Opacity" value={Math.round(shadow.opacity * 100)} min={0} max={100} step={1} unit="%" defaultValue={25} onChange={(value) => set({ opacity: value / 100 }, 'shadow-opacity')} />
          <SliderField label="Blur" value={shadow.blur} min={0} max={200} step={1} unit="u" defaultValue={40} onChange={(blur) => set({ blur }, 'shadow-blur')} />
          <div className="grid grid-cols-3 gap-2">
            <NumberField icon="X" value={shadow.x} step={1} onChange={(x) => set({ x }, 'shadow-x')} />
            <NumberField icon="Y" value={shadow.y} step={1} onChange={(y) => set({ y }, 'shadow-y')} />
            <NumberField icon="S" value={shadow.spread} step={1} onChange={(spread) => set({ spread }, 'shadow-spread')} />
          </div>
        </>
      )}
    </Section>
  );
}

export function StrokeSection({ stroke, onChange, title = 'Stroke' }: { stroke: Stroke; onChange: (stroke: Stroke, key: string) => void; title?: string }) {
  const set = (patch: Partial<Stroke>, key: string) => onChange({ ...stroke, ...patch }, key);
  return (
    <Section
      title={title}
      defaultOpen={stroke.enabled}
      actions={<Toggle checked={stroke.enabled} onChange={(enabled) => set({ enabled }, 'stroke-enabled')} />}
    >
      {stroke.enabled && (
        <>
          <Field label="Color">
            <ColorField value={stroke.color} allowAlpha={false} onChange={(color) => set({ color }, 'stroke-color')} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <NumberField icon="W" unit="u" value={stroke.width} min={0} max={80} step={0.5} precision={1} onChange={(width) => set({ width }, 'stroke-width')} />
            <NumberField icon="α" unit="%" value={Math.round(stroke.opacity * 100)} min={0} max={100} onChange={(value) => set({ opacity: value / 100 }, 'stroke-opacity')} />
          </div>
        </>
      )}
    </Section>
  );
}

export type { Update };
