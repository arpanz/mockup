import { useState } from 'react';
import { Pipette } from 'lucide-react';
import { applyBrandColor, extractPalette, measureImageBackdrops } from '../../model/brandColors';
import type { Project } from '../../model/types';
import { useEditor } from '../../store/editorStore';
import { Button, ColorField, Section } from '../../ui';

/** Screenshot sources, the user's own first so sample screens only fill in. */
function screenSources(project: Project) {
  const candidates = project.slides.flatMap((slide) => slide.elements.flatMap((element) => {
    if (element.type !== 'device' || !element.screen.assetId) return [];
    const asset = project.assets[element.screen.assetId];
    return asset?.src ? [{ src: asset.src, sample: asset.sample === true }] : [];
  }));
  return Array.from(new Set(candidates.sort((a, b) => Number(a.sample) - Number(b.sample)).map((item) => item.src)));
}

export function BrandColorSection() {
  const hasScreens = useEditor((state) => state.project.slides.some((slide) => slide.elements.some((element) => element.type === 'device' && element.screen.assetId)));
  const [palette, setPalette] = useState<string[]>([]);
  const [customColor, setCustomColor] = useState('#6366F1');
  const [applied, setApplied] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [hasRead, setHasRead] = useState(false);

  const pickPalette = async () => {
    setReading(true);
    try {
      setPalette(await extractPalette(screenSources(useEditor.getState().project)));
      setHasRead(true);
    } finally {
      setReading(false);
    }
  };
  const apply = async (hex: string) => {
    setApplied(hex);
    const backdrops = await measureImageBackdrops(useEditor.getState().project);
    useEditor.getState().commit((draft) => applyBrandColor(draft, hex, backdrops));
  };

  return (
    <Section title="Brand color">
      <p className="text-[11px] text-zinc-500">Recolors backgrounds, accents and shapes to your app’s hue. Undo anytime.</p>
      <Button variant="secondary" size="sm" icon={<Pipette size={13} />} disabled={reading || !hasScreens} onClick={pickPalette}>
        {reading ? 'Reading colors…' : 'Pick from my screenshots'}
      </Button>
      {palette.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {palette.map((hex) => (
            <button key={hex} type="button" title={hex} aria-label={`Apply ${hex}`} aria-pressed={applied === hex} onClick={() => void apply(hex)} className={`h-7 w-7 rounded-full border border-white/15 transition-transform hover:scale-110 ${applied === hex ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-zinc-900' : ''}`} style={{ backgroundColor: hex }} />
          ))}
        </div>
      )}
      {!reading && hasRead && palette.length === 0 && <p className="text-[11px] text-zinc-500">No strong colors found in your screenshots.</p>}
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1"><ColorField value={customColor} onChange={setCustomColor} allowAlpha={false} /></div>
        <Button variant="secondary" size="sm" onClick={() => void apply(customColor)}>Apply</Button>
      </div>
    </Section>
  );
}
