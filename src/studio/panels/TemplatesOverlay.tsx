import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { applyTemplate } from '../templates/applyTemplate';
import { TEMPLATES, type Template } from '../templates/catalog';
import { TemplateCard } from '../templates/TemplateCard';
import { useEditor } from '../store/editorStore';
import { useToast } from '../ui';

const CATEGORIES = ['All', ...Array.from(new Set(TEMPLATES.map((template) => template.category)))];

export function TemplatesOverlay({ rightInset }: { rightInset: number }) {
  const project = useEditor((state) => state.project);
  const [category, setCategory] = useState('All');
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const toast = useToast();

  // Preview every template with the user's own screenshots.
  const screens = useMemo(
    () => project.slides.map((slide) => {
      const device = slide.elements.find((element) => element.type === 'device');
      return device?.type === 'device' ? device.screen.assetId : null;
    }),
    [project.slides],
  );

  const apply = (template: Template) => {
    const store = useEditor.getState();
    store.commit((draft) => {
      const next = applyTemplate(store.project, template);
      draft.slides = next.slides;
      draft.span = next.span;
    });
    store.selectSlide(useEditor.getState().project.slides[0]?.id ?? '');
    setAppliedId(template.id);
    toast({
      title: `Applied “${template.name}”`,
      description: 'Your screenshots and copy were kept.',
      tone: 'success',
      action: { label: 'Undo', onClick: () => useEditor.getState().undo() },
    });
  };

  return (
    <div
      className="absolute bottom-24 left-4 top-20 z-40 flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/90 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
      style={{ right: rightInset + 16 }}
    >
      <div className="flex items-center gap-4 border-b border-white/[0.06] px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-white">Templates</h2>
          <p className="text-[12px] text-zinc-500">Restyle every screenshot at once. Your images and headlines stay.</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-1">
          {CATEGORIES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setCategory(name)}
              className={`h-7 rounded-full px-3 text-[12px] font-medium transition-colors ${category === name ? 'bg-white/[0.12] text-white' : 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100'}`}
            >
              {name}
            </button>
          ))}
        </div>
        <button type="button" aria-label="Close templates" onClick={() => useEditor.getState().setMode('editor')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.08] hover:text-white">
          <X size={16} />
        </button>
      </div>
      <div data-scrollable className="grid min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(300px,1fr))] content-start gap-4 overflow-y-auto p-5">
        {TEMPLATES.filter((template) => category === 'All' || template.category === category).map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            screens={screens}
            assets={project.assets}
            selected={appliedId === template.id}
            onSelect={() => apply(template)}
          />
        ))}
      </div>
    </div>
  );
}
