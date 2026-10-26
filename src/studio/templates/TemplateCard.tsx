import { memo, useMemo, type ReactElement } from 'react';
import type { Asset, Project } from '../model/types';
import { OUTPUT_CATALOG } from '../model/outputs';
import { SlideRenderer } from '../render/SlideRenderer';
import type { Template } from './catalog';

export interface TemplateCardProps {
  template: Template;
  screens: Array<string | null>;
  assets: Project['assets'];
  selected: boolean;
  onSelect: () => void;
}

function TemplateCardImpl({ template, screens, assets, selected, onSelect }: TemplateCardProps): ReactElement {
  const gap = template.category === 'Panorama' ? 0 : 6;
  const height = 150;
  const width = height * OUTPUT_CATALOG[0].width / OUTPUT_CATALOG[0].height;
  // Render at 2× thumbnail size rather than full export size: everything is laid out in canvas-relative
  // units, so the slide looks the same, but the browser paints ~300px layers instead of 2868px ones.
  const output = useMemo(() => ({ ...OUTPUT_CATALOG[0], width: width * 2, height: height * 2 }), [width]);
  const preview = useMemo(() => {
    const built = template.build(screens.slice(0, 3), template.defaultCopy.slice(0, 3));
    const slides = built.slides.slice(0, 3);
    return {
      project: {
        version: 2 as const,
        id: `preview-${template.id}`,
        name: template.name,
        outputs: [output],
        slides,
        assets,
        span: built.span,
        updatedAt: 0,
      },
      slides,
    };
  }, [assets, output, screens, template]);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group w-full overflow-hidden rounded-xl border bg-[#18181b] text-left transition duration-150 hover:-translate-y-0.5 ${selected ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-white/10 hover:border-white/25'}`}
    >
      <div className="flex justify-center overflow-hidden bg-black/20" style={{ gap, padding: gap }}>
        {preview.slides.map((slide, index) => (
          <div key={slide.id} className="shrink-0 overflow-hidden rounded-[5px] shadow-lg" style={{ width, height }}>
            <div style={{ width: output.width, height: output.height, transform: 'scale(.5)', transformOrigin: 'top left' }}>
              <SlideRenderer project={preview.project} slide={slide} output={output} slideIndex={index} />
            </div>
          </div>
        ))}
      </div>
      <div className="px-3.5 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold text-zinc-100">{template.name}</span>
          <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">{template.category}</span>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">{template.description}</p>
      </div>
    </button>
  );
}

export const TemplateCard = memo(TemplateCardImpl);
