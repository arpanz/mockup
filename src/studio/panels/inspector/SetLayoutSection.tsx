import { RotateCcw } from 'lucide-react';
import { applySetLayout, DEFAULT_SET_LAYOUT, SET_LAYOUT_RANGES, setSubtitlesVisible } from '../../model/setLayout';
import type { SetLayout, Slide } from '../../model/types';
import { useEditor } from '../../store/editorStore';
import { Section, SliderField, Toggle, Tooltip } from '../../ui';

/** Sizes read as a share of the template's (100%); positions as a share of the canvas height, + moves down. */
const SLIDERS: Array<{ key: keyof SetLayout; label: string }> = [
  { key: 'deviceScale', label: 'Phone size' },
  { key: 'deviceShift', label: 'Phone pos.' },
  { key: 'titleScale', label: 'Headline' },
  { key: 'subtitleScale', label: 'Subtitle' },
  { key: 'textShift', label: 'Text pos.' },
];
const toUi = (value: number) => Math.round(value * 100);

function countSubtitles(slides: Slide[], visibleOnly: boolean) {
  return slides.reduce((count, slide) => count + slide.elements.filter((element) => element.type === 'text' && element.role === 'subtitle' && (!visibleOnly || element.visible)).length, 0);
}

/** Tune the whole set at once: sizes and positions of every phone and line of text, plus subtitles on or off. */
export function SetLayoutSection() {
  const saved = useEditor((state) => state.project.layout);
  const subtitleCount = useEditor((state) => countSubtitles(state.project.slides, false));
  const visibleSubtitles = useEditor((state) => countSubtitles(state.project.slides, true));
  const layout = { ...DEFAULT_SET_LAYOUT, ...saved };
  const store = useEditor.getState;
  const changed = (Object.keys(DEFAULT_SET_LAYOUT) as Array<keyof SetLayout>).some((key) => Math.abs(layout[key] - DEFAULT_SET_LAYOUT[key]) > 1e-6);

  return (
    <Section
      title="Whole set"
      actions={changed ? (
        <Tooltip content="Back to the template’s layout">
          <button type="button" aria-label="Reset whole-set layout" onClick={() => store().commit((draft) => applySetLayout(draft, DEFAULT_SET_LAYOUT))} className="flex items-center gap-1 text-[11px] font-medium normal-case tracking-normal text-zinc-400 hover:text-white">
            <RotateCcw size={12} /> Reset
          </button>
        </Tooltip>
      ) : undefined}
    >
      {SLIDERS.map(({ key, label }) => {
        const [min, max] = SET_LAYOUT_RANGES[key];
        return (
          <SliderField
            key={key}
            label={label}
            value={toUi(layout[key])}
            min={toUi(min)}
            max={toUi(max)}
            step={1}
            unit="%"
            defaultValue={toUi(DEFAULT_SET_LAYOUT[key])}
            onChange={(value) => store().commit((draft) => applySetLayout(draft, { [key]: value / 100 }), { coalesce: `set-layout-${key}` })}
          />
        );
      })}
      {subtitleCount > 0 && (
        <label className="flex items-center justify-between text-[11px] text-zinc-400">
          <span>Subtitles on every screenshot</span>
          <Toggle checked={visibleSubtitles > 0} onChange={(visible) => store().commit((draft) => setSubtitlesVisible(draft, visible))} />
        </label>
      )}
    </Section>
  );
}
