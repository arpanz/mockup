import { useState, type ReactElement } from 'react';
import { createDemoAssets } from '../model/demo';
import type { Asset } from '../model/types';
import { TEMPLATES } from './catalog';
import { TemplateCard } from './TemplateCard';

const categories = ['Minimal', 'Bold', 'Dark', 'Playful', 'Editorial', 'Panorama'] as const;

export function TemplateGallery(): ReactElement {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assets] = useState<Asset[]>(() => createDemoAssets());
  const assetMap = Object.fromEntries(assets.map((asset) => [asset.id, asset]));
  const screens = assets.map((asset) => asset.id);

  return (
    <main className="min-h-screen bg-[#09090b] px-6 py-8 text-zinc-100 sm:px-10">
      <header className="mx-auto mb-9 max-w-7xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-400">Frameflow Studio</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Start with a point of view</h1>
        <p className="mt-1.5 text-sm text-zinc-400">18 carefully art-directed systems. Add your screens, then make them yours.</p>
      </header>
      <div className="mx-auto max-w-7xl space-y-9">
        {categories.map((category) => {
          const templates = TEMPLATES.filter((template) => template.category === category);
          return (
            <section key={category}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-300">{category}</h2>
                <span className="text-[11px] text-zinc-600">{templates.length} styles</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {templates.map((template) => (
                  <TemplateCard key={template.id} template={template} screens={screens} assets={assetMap} selected={selectedId === template.id} onSelect={() => setSelectedId(template.id)} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
