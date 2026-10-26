import { useMemo, useState, type CSSProperties } from 'react';
import { X } from 'lucide-react';
import { applyTemplate } from '../templates/applyTemplate';
import { TEMPLATES, type Template } from '../templates/catalog';
import { TemplateCard } from '../templates/TemplateCard';
import { usePreviewAssets } from '../templates/previewAssets';
import { hasScreenshots, withSampleScreens } from '../templates/sampleScreens';
import { useEditor } from '../store/editorStore';
import { useToast } from '../ui';

const CATEGORIES = ['All', ...Array.from(new Set(TEMPLATES.map((template) => template.category)))];

export function TemplatesOverlay({ rightInset }: { rightInset: number }) {
  const project = useEditor((state) => state.project);
  const [category, setCategory] = useState('All');
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const toast = useToast();

  // Preview every template with the user's own screenshots, or sample screens until they add some.
  const source = useMemo(() => withSampleScreens(project), [project]);
  const screens = useMemo(
    () => source.slides.map((slide) => {
      const device = slide.elements.find((element) => element.type === 'device');
      return device?.type === 'device' ? device.screen.assetId : null;
    }),
    [source.slides],
  );
  const previewAssets = usePreviewAssets(source.assets, screens.slice(0, 3));

  const apply = (template: Template) => {
    const store = useEditor.getState();
    const samples = !hasScreenshots(store.project);
    store.commit((draft) => {
      const next = applyTemplate(withSampleScreens(store.project), template);
      draft.slides = next.slides;
      draft.span = next.span;
      draft.assets = next.assets;
      delete draft.layout;
    });
    store.selectSlide(useEditor.getState().project.slides[0]?.id ?? '');
    setAppliedId(template.id);
    toast({
      title: `Applied “${template.name}”`,
      description: samples ? 'Drop your screenshots onto each phone to replace the samples.' : 'Your screenshots and copy were kept.',
      tone: 'success',
      action: { label: 'Undo', onClick: () => useEditor.getState().undo() },
    });
  };

  return (
    <div
      className="absolute bottom-24 left-4 right-[var(--templates-right)] top-20 z-40 flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.8)] max-[1040px]:right-4"
      style={{ '--templates-right': `${rightInset + 16}px` } as CSSProperties}
    >
      <div className="border-b border-white/[0.06] px-5 pb-3 pt-4">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-white">Templates</h2>
            <p className="text-[12px] text-zinc-500">{hasScreenshots(project) ? 'Restyle every screenshot at once. Your images and headlines stay.' : 'Pick a look to start. Add your screenshots after; they drop straight into the phones.'}</p>
          </div>
          <button type="button" aria-label="Close templates" onClick={() => useEditor.getState().setMode('editor')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.08] hover:text-white">
            <X size={16} />
          </button>
        </div>
        <div className="-mx-1 mt-3 flex gap-1 overflow-x-auto">
          {CATEGORIES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setCategory(name)}
              className={`h-7 shrink-0 rounded-full px-3 text-[12px] font-medium transition-colors ${category === name ? 'bg-white/[0.12] text-white' : 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100'}`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <div data-scrollable className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(264px,1fr))] gap-4">
        {TEMPLATES.filter((template) => category === 'All' || template.category === category).map((template) => previewAssets ? (
          <TemplateCard
            key={template.id}
            template={template}
            screens={screens}
            assets={previewAssets}
            source={source}
            selected={appliedId === template.id}
            onSelect={() => apply(template)}
          />
        ) : (
          <div key={template.id} className="h-[230px] animate-pulse rounded-xl border border-white/10 bg-white/[0.03]" />
        ))}
        </div>
      </div>
    </div>
  );
}
