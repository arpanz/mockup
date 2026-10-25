import { AlignHorizontalSpaceAround, AlignVerticalSpaceAround, Circle, Hexagon, Square, Star } from 'lucide-react';
import type { ImageElement, OutputSpec, ShapeElement, StudioElement } from '../../model/types';
import { useEditor } from '../../store/editorStore';
import { AlignButtons, Field, NumberField, PaintField, Section, Segmented, SliderField, Tooltip } from '../../ui';
import { PositionSection, ShadowSection, StrokeSection, type Update } from './common';
import { elementBox } from '../../render/geometry';

export function ImageInspector({ element, output, update }: { element: ImageElement; output: OutputSpec; update: Update }) {
  const asset = useEditor((state) => state.project.assets[element.assetId]);
  return (
    <>
      <Section title="Image">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#232326]">
            {asset && <img src={asset.src} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0 text-[12px]">
            <div className="truncate font-medium text-zinc-200">{asset?.name ?? 'Missing image'}</div>
            <div className="text-zinc-500">{asset ? `${asset.width} × ${asset.height}` : ''}</div>
          </div>
        </div>
        <Segmented fullWidth size="sm" value={element.fit} onChange={(fit) => update({ fit }, 'fit')} options={[{ value: 'cover', label: 'Fill' }, { value: 'contain', label: 'Fit' }]} />
        <div className="grid grid-cols-3 gap-2">
          <NumberField icon="W" value={Math.round(element.w)} min={4} max={3000} unit="u" onChange={(w) => update({ w }, 'w', 'content')} />
          <NumberField icon="H" value={Math.round(element.h)} min={4} max={3000} unit="u" onChange={(h) => update({ h }, 'h', 'content')} />
          <NumberField icon="R" value={Math.round(element.radius)} min={0} max={1000} unit="u" onChange={(radius) => update({ radius }, 'radius')} />
        </div>
      </Section>
      <StrokeSection stroke={element.stroke} onChange={(stroke, key) => update({ stroke }, key)} />
      <ShadowSection shadow={element.shadow} onChange={(shadow, key) => update({ shadow }, key)} />
      <PositionSection element={element} output={output} update={update} />
    </>
  );
}

export function ShapeInspector({ element, output, update }: { element: ShapeElement; output: OutputSpec; update: Update }) {
  return (
    <>
      <Section title="Shape">
        <Segmented
          fullWidth
          value={element.shape}
          onChange={(shape) => update({ shape }, 'shape')}
          options={[
            { value: 'rect', icon: <Square size={14} />, title: 'Rectangle' },
            { value: 'ellipse', icon: <Circle size={14} />, title: 'Ellipse' },
            { value: 'star', icon: <Star size={14} />, title: 'Star' },
            { value: 'blob', icon: <Hexagon size={14} />, title: 'Blob' },
          ]}
        />
        <div className="grid grid-cols-3 gap-2">
          <NumberField icon="W" value={Math.round(element.w)} min={4} max={4000} unit="u" onChange={(w) => update({ w }, 'w', 'content')} />
          <NumberField icon="H" value={Math.round(element.h)} min={4} max={4000} unit="u" onChange={(h) => update({ h }, 'h', 'content')} />
          {element.shape === 'rect'
            ? <NumberField icon="R" value={Math.round(element.radius)} min={0} max={2000} unit="u" onChange={(radius) => update({ radius }, 'radius')} />
            : <div />}
        </div>
        <SliderField label="Blur" value={element.blur} min={0} max={300} step={1} unit="u" defaultValue={0} onChange={(blur) => update({ blur }, 'blur')} />
      </Section>
      <Section title="Fill">
        <PaintField value={element.fill} onChange={(fill) => update({ fill }, 'fill')} />
      </Section>
      <StrokeSection stroke={element.stroke} onChange={(stroke, key) => update({ stroke }, key)} />
      <ShadowSection shadow={element.shadow} onChange={(shadow, key) => update({ shadow }, key)} />
      <PositionSection element={element} output={output} update={update} />
    </>
  );
}

/** Several elements: align to each other, distribute, shared opacity. */
export function MultiInspector({ elements, output, update }: { elements: StudioElement[]; output: OutputSpec; update: Update }) {
  const boxes = elements.map((element) => {
    const box = elementBox(element, output);
    return { id: element.id, x: element.x, y: element.y, hw: box.width / output.width / 2, hh: box.height / output.height / 2 };
  });
  const left = Math.min(...boxes.map((b) => b.x - b.hw));
  const right = Math.max(...boxes.map((b) => b.x + b.hw));
  const top = Math.min(...boxes.map((b) => b.y - b.hh));
  const bottom = Math.max(...boxes.map((b) => b.y + b.hh));
  const byId = Object.fromEntries(boxes.map((b) => [b.id, b]));

  const distribute = (axis: 'x' | 'y') => {
    const sorted = [...boxes].sort((a, b) => a[axis] - b[axis]);
    if (sorted.length < 3) return;
    const first = sorted[0][axis];
    const last = sorted[sorted.length - 1][axis];
    const step = (last - first) / (sorted.length - 1);
    const targets = Object.fromEntries(sorted.map((b, index) => [b.id, first + step * index]));
    update((draft) => { draft[axis] = targets[draft.id] ?? draft[axis]; }, `distribute-${axis}`, 'content');
  };

  const opacity = Math.round((elements.reduce((sum, element) => sum + element.opacity, 0) / elements.length) * 100);

  return (
    <>
      <Section title={`${elements.length} layers`}>
        <AlignButtons
          onAlign={(axis, where) => {
            update((draft) => {
              const b = byId[draft.id];
              if (!b) return;
              if (axis === 'x') draft.x = where === 'start' ? left + b.hw : where === 'end' ? right - b.hw : (left + right) / 2;
              else draft.y = where === 'start' ? top + b.hh : where === 'end' ? bottom - b.hh : (top + bottom) / 2;
            }, `align-${axis}-${where}`, 'content');
          }}
        />
        <div className="flex gap-1.5">
          <Tooltip content="Distribute horizontally">
            <button type="button" disabled={elements.length < 3} onClick={() => distribute('x')} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-white/[0.04] text-[12px] text-zinc-300 hover:bg-white/[0.08] disabled:opacity-40">
              <AlignHorizontalSpaceAround size={14} /> Distribute
            </button>
          </Tooltip>
          <Tooltip content="Distribute vertically">
            <button type="button" disabled={elements.length < 3} onClick={() => distribute('y')} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-white/[0.04] text-[12px] text-zinc-300 hover:bg-white/[0.08] disabled:opacity-40">
              <AlignVerticalSpaceAround size={14} /> Distribute
            </button>
          </Tooltip>
        </div>
        <Field label="Opacity">
          <NumberField unit="%" value={opacity} min={0} max={100} onChange={(value) => update({ opacity: value / 100 }, 'opacity')} />
        </Field>
      </Section>
    </>
  );
}
