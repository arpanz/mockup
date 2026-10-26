import type { RefObject } from 'react';
import { AlignCenter, AlignLeft, AlignRight, CaseSensitive, CaseUpper, ChevronDown, MoveVertical, MoveHorizontal } from 'lucide-react';
import type { OutputSpec, TextElement } from '../../model/types';
import { getFont } from '../../text/fontCatalog';
import { fontStack } from '../../text/fontLoader';
import { FontPicker } from '../../text/FontPicker';
import { accentCss } from '../../text/TextBlock';
import { ColorField, Field, NumberField, PaintField, Popover, Section, Segmented, Select, SliderField, TextArea, Toggle, usePopover } from '../../ui';
import { PositionSection, ShadowSection, StrokeSection, type Update } from './common';

const ACCENT_STYLES: Array<{ value: TextElement['accent']['style']; label: string }> = [
  { value: 'color', label: 'Color' },
  { value: 'highlight', label: 'Marker' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'italic-serif', label: 'Serif' },
  { value: 'underline', label: 'Brush' },
  { value: 'wave', label: 'Wave' },
  { value: 'zigzag', label: 'Zigzag' },
  { value: 'circle', label: 'Circle' },
];

const WEIGHT_NAMES: Record<number, string> = {
  100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black',
};

function FontButton({ element, update }: { element: TextElement; update: Update }) {
  const popover = usePopover();
  return (
    <>
      <button
        ref={popover.anchorRef as RefObject<HTMLButtonElement>}
        type="button"
        onClick={popover.toggle}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-md border border-white/10 bg-[#232326] px-2.5 text-left text-[13px] text-zinc-100 transition-colors hover:border-white/20"
      >
        <span className="truncate" style={{ fontFamily: fontStack(element.fontFamily), fontWeight: element.fontWeight }}>{element.fontFamily}</span>
        <ChevronDown size={14} className="shrink-0 text-zinc-500" />
      </button>
      <Popover open={popover.open} onOpenChange={popover.setOpen} anchor={popover.anchorRef} side="left" align="start" offset={12}>
        <FontPicker
          value={element.fontFamily}
          weight={element.fontWeight}
          onChange={(fontFamily, fontWeight) => update({ fontFamily, fontWeight }, 'font')}
          onClose={() => popover.setOpen(false)}
        />
      </Popover>
    </>
  );
}

export function TextInspector({ element, output, update }: { element: TextElement; output: OutputSpec; update: Update }) {
  const weights = getFont(element.fontFamily)?.weights ?? [400, 500, 600, 700, 800];
  const accent = element.accent;
  const plate = element.plate;

  return (
    <>
      <Section title="Text">
        <TextArea
          value={element.text}
          rows={3}
          placeholder="Type a headline…"
          onChange={(text) => update({ text }, 'text', 'content')}
        />
        <p className="text-[11px] leading-relaxed text-zinc-500">
          Wrap words in <span className="rounded bg-white/[0.06] px-1 font-mono text-zinc-300">*asterisks*</span> to apply the accent. Double-click text on the canvas to edit in place.
        </p>
      </Section>

      <Section title="Typography">
        <FontButton element={element} update={update} />
        <div className="grid grid-cols-[1fr_88px] gap-2">
          <Select
            value={String(element.fontWeight)}
            options={weights.map((weight) => ({ value: String(weight), label: WEIGHT_NAMES[weight] ?? String(weight) }))}
            onChange={(value) => update({ fontWeight: Number(value) }, 'weight')}
          />
          <NumberField icon="Aa" value={Math.round(element.fontSize)} min={6} max={400} unit="u" onChange={(fontSize) => update({ fontSize }, 'font-size')} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberField icon={<MoveVertical size={12} />} value={element.lineHeight} min={0.6} max={3} step={0.02} precision={2} onChange={(lineHeight) => update({ lineHeight }, 'line-height')} />
          <NumberField icon={<MoveHorizontal size={12} />} value={Math.round(element.letterSpacing * 1000) / 10} min={-20} max={50} step={0.5} precision={1} unit="%" onChange={(value) => update({ letterSpacing: value / 100 }, 'letter-spacing')} />
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Segmented
            fullWidth
            value={element.align}
            onChange={(align) => update({ align }, 'align')}
            options={[
              { value: 'left', icon: <AlignLeft size={14} />, title: 'Align left' },
              { value: 'center', icon: <AlignCenter size={14} />, title: 'Align center' },
              { value: 'right', icon: <AlignRight size={14} />, title: 'Align right' },
            ]}
          />
          <Segmented
            value={element.transform}
            onChange={(transform) => update({ transform }, 'transform')}
            options={[
              { value: 'none', icon: <CaseSensitive size={15} />, title: 'As typed' },
              { value: 'uppercase', icon: <CaseUpper size={15} />, title: 'Uppercase' },
            ]}
          />
        </div>
        <SliderField label="Width" value={Math.round(element.w * 100)} min={10} max={100} step={1} unit="%" defaultValue={86} onChange={(value) => update({ w: value / 100 }, 'width', 'content')} />
        <Field label="Fit to">
          <Segmented
            fullWidth
            size="sm"
            value={String(element.maxLines ?? (element.role === 'title' ? 2 : 0))}
            onChange={(value) => update({ maxLines: Number(value) }, 'max-lines')}
            options={[
              { value: '0', label: 'Off', title: 'Never shrink' },
              { value: '1', label: '1 line' },
              { value: '2', label: '2 lines' },
              { value: '3', label: '3 lines' },
            ]}
          />
        </Field>
      </Section>

      <Section title="Fill">
        <PaintField value={element.fill} onChange={(fill) => update({ fill }, 'fill')} />
      </Section>

      <Section title="Accent">
        <div role="radiogroup" aria-label="Accent style" className="grid grid-cols-4 gap-1.5">
          {ACCENT_STYLES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={accent.style === value}
              title={label}
              onClick={() => update({ accent: { ...accent, style: value } }, 'accent-style')}
              className={`flex h-[46px] flex-col items-center justify-center gap-0.5 rounded-md border text-[10px] transition-colors ${accent.style === value
                ? 'border-indigo-400/70 bg-indigo-500/15 text-zinc-100'
                : 'border-white/[0.06] bg-white/[0.03] text-zinc-500 hover:border-white/15 hover:text-zinc-300'}`}
            >
              <span className="text-[15px] font-bold leading-none text-zinc-100" style={accentCss({ ...accent, style: value })}>Aa</span>
              {label}
            </button>
          ))}
        </div>
        {accent.style === 'gradient' ? (
          <PaintField value={accent.paint} onChange={(paint) => update({ accent: { ...accent, paint } }, 'accent-paint')} />
        ) : (
          <Field label={accent.style === 'highlight' ? 'Marker' : 'Color'}>
            <ColorField value={accent.color} onChange={(color) => update({ accent: { ...accent, color } }, 'accent-color')} />
          </Field>
        )}
        {accent.style === 'highlight' && (
          <Field label="Text">
            <ColorField value={accent.textColor} allowAlpha={false} onChange={(textColor) => update({ accent: { ...accent, textColor } }, 'accent-text')} />
          </Field>
        )}
      </Section>

      <Section
        title="Badge"
        defaultOpen={plate.enabled}
        actions={<Toggle checked={plate.enabled} onChange={(enabled) => update({ plate: { ...plate, enabled } }, 'plate-enabled')} />}
      >
        {plate.enabled && (
          <>
            <PaintField value={plate.paint} onChange={(paint) => update({ plate: { ...plate, paint } }, 'plate-paint')} />
            <div className="grid grid-cols-3 gap-2">
              <NumberField icon="R" value={Math.min(plate.radius, 200)} min={0} max={200} unit="u" onChange={(radius) => update({ plate: { ...plate, radius } }, 'plate-radius')} />
              <NumberField icon={<MoveHorizontal size={12} />} value={plate.padX} min={0} max={200} unit="u" onChange={(padX) => update({ plate: { ...plate, padX } }, 'plate-padx')} />
              <NumberField icon={<MoveVertical size={12} />} value={plate.padY} min={0} max={200} unit="u" onChange={(padY) => update({ plate: { ...plate, padY } }, 'plate-pady')} />
            </div>
          </>
        )}
      </Section>

      <StrokeSection title="Outline" stroke={element.stroke} onChange={(stroke, key) => update({ stroke }, key)} />
      <ShadowSection shadow={element.shadow} onChange={(shadow, key) => update({ shadow }, key)} />
      <PositionSection element={element} output={output} update={update} />
    </>
  );
}
