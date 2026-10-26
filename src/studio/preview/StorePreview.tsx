import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronLeft, Download, ImagePlus, Mic, MoreVertical, Search, Share, Star, UserRound, X } from 'lucide-react';
import { outputById } from '../model/outputs';
import type { OutputSpec, Project, StoreListing } from '../model/types';
import { useEditor } from '../store/editorStore';
import { readImageFile } from '../store/persistence';
import { usePreviewAssets } from '../templates/previewAssets';
import { Segmented, TextInput, useToast } from '../ui';
import { SlideThumb } from './SlideThumb';

type Store = 'app-store' | 'play';
type Theme = 'light' | 'dark';

const CATEGORIES = ['Productivity', 'Health & Fitness', 'Finance', 'Education', 'Lifestyle', 'Photo & Video', 'Social Networking', 'Utilities', 'Entertainment', 'Travel', 'Food & Drink', 'Shopping', 'Music', 'Business', 'Games'];

export function listingOf(project: Project): StoreListing {
  return {
    name: project.name && project.name !== 'Untitled project' ? project.name.replace(/ — App Store$/, '') : 'Your App',
    subtitle: 'Your tagline goes here',
    developer: 'Your Studio',
    category: 'Productivity',
    iconAssetId: null,
    rating: 4.8,
    ratings: '12K',
    ...project.listing,
  };
}

const updateListing = (patch: Partial<StoreListing>, key?: string) => useEditor.getState().commit((draft) => {
  draft.listing = { ...listingOf(draft as Project), ...patch };
}, key ? { coalesce: `listing-${key}` } : undefined);

interface Colors { bg: string; text: string; muted: string; line: string; field: string; accent: string; button: string }

/** The colors each store uses for its own chrome, so the preview reads as the real listing. */
const PALETTE: Record<Store, Record<Theme, Colors>> = {
  'app-store': {
    light: { bg: '#FFFFFF', text: '#000000', muted: '#8A8A8E', line: '#E5E5EA', field: '#EEEEF0', accent: '#007AFF', button: '#EEEEF0' },
    dark: { bg: '#000000', text: '#FFFFFF', muted: '#8D8D93', line: '#2C2C2E', field: '#1C1C1E', accent: '#0A84FF', button: '#2C2C2E' },
  },
  play: {
    light: { bg: '#FFFFFF', text: '#1F1F1F', muted: '#5F6368', line: '#E3E3E3', field: '#F1F3F4', accent: '#01875F', button: '#01875F' },
    dark: { bg: '#131314', text: '#E3E3E3', muted: '#9AA0A6', line: '#2D2F31', field: '#1F2023', accent: '#A8DAB5', button: '#A8DAB5' },
  },
};

function Stars({ rating, size, color }: { rating: number; size: number; color: string }) {
  return (
    <span className="relative inline-flex" style={{ height: size }}>
      <span className="flex gap-px opacity-25">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={size} fill={color} stroke="none" />)}</span>
      <span className="absolute inset-y-0 left-0 flex gap-px overflow-hidden" style={{ width: `${(Math.min(5, Math.max(0, rating)) / 5) * 100}%` }}>
        {Array.from({ length: 5 }, (_, i) => <Star key={i} size={size} fill={color} stroke="none" className="shrink-0" />)}
      </span>
    </span>
  );
}

function AppIcon({ listing, src, size, accent, play }: { listing: StoreListing; src?: string; size: number; accent: string; play?: boolean }) {
  const radius = play ? size * 0.2 : size * 0.225;
  const style: CSSProperties = { width: size, height: size, borderRadius: radius };
  if (src) return <img src={src} alt="" className="shrink-0 object-cover shadow-[0_0_0_0.5px_rgba(0,0,0,0.12)]" style={style} />;
  return (
    <div className="flex shrink-0 items-center justify-center font-bold text-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.12)]" style={{ ...style, fontSize: size * 0.46, background: `linear-gradient(145deg, ${accent}, color-mix(in srgb, ${accent} 55%, #000))` }}>
      {listing.name.trim().charAt(0).toUpperCase() || 'A'}
    </div>
  );
}

function Phone({ children, colors, label, play }: { children: ReactNode; colors: Colors; label: string; play?: boolean }) {
  return (
    <figure className="flex flex-col items-center gap-3">
      <div className="relative h-[612px] w-[296px] rounded-[48px] bg-[#0b0b0d] p-[9px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85),inset_0_0_0_1.5px_rgba(255,255,255,0.14)] transition-transform duration-300 hover:-translate-y-1">
        <div className="relative h-full w-full overflow-hidden rounded-[40px]" style={{ background: colors.bg, color: colors.text }}>
          {play
            ? <div className="absolute left-1/2 top-[14px] z-10 h-[11px] w-[11px] -translate-x-1/2 rounded-full bg-black" />
            : <div className="absolute left-1/2 top-[9px] z-10 h-[24px] w-[84px] -translate-x-1/2 rounded-full bg-black" />}
          <div className="h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            <div className="flex h-[44px] items-center justify-between px-7 pt-1 text-[13px] font-semibold">
              <span>9:41</span>
              <span className="flex items-center gap-1">
                <span className="h-[9px] w-[15px] rounded-[2px] border border-current opacity-80" />
              </span>
            </div>
            {children}
          </div>
        </div>
      </div>
      <figcaption className="text-[12px] font-medium text-zinc-500">{label}</figcaption>
    </figure>
  );
}

function ShotRow({ children, scroll }: { children: ReactNode; scroll?: boolean }) {
  return <div className={`flex gap-2 px-4 ${scroll ? 'overflow-x-auto pb-1' : ''}`} style={scroll ? { scrollbarWidth: 'none', scrollSnapType: 'x mandatory' } : undefined}>{children}</div>;
}

interface PageProps {
  listing: StoreListing;
  colors: Colors;
  icon: (size: number) => ReactNode;
  shots: (width: number, radius: number) => ReactNode[];
}

function AppStoreSearch({ listing, colors, icon, shots }: PageProps) {
  return (
    <div className="pb-6">
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-1">
        <div className="flex h-9 flex-1 items-center gap-1.5 rounded-[10px] px-2.5 text-[15px]" style={{ background: colors.field }}>
          <Search size={15} style={{ color: colors.muted }} />
          <span className="truncate">{listing.name.toLowerCase()}</span>
        </div>
        <span className="text-[15px]" style={{ color: colors.accent }}>Cancel</span>
      </div>
      <div className="flex items-center gap-3 px-4">
        {icon(56)}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold leading-tight">{listing.name}</div>
          <div className="truncate text-[13px]" style={{ color: colors.muted }}>{listing.subtitle}</div>
        </div>
        <span className="rounded-full px-4 py-1 text-[14px] font-bold" style={{ background: colors.button, color: colors.accent }}>Get</span>
      </div>
      <div className="flex items-center gap-3 px-4 pb-3 pt-2 text-[11px]" style={{ color: colors.muted }}>
        <span className="flex items-center gap-1"><Stars rating={listing.rating} size={10} color={colors.muted} />{listing.ratings}</span>
        <span className="flex min-w-0 items-center gap-1"><UserRound size={11} /><span className="truncate">{listing.developer}</span></span>
        <span className="truncate">{listing.category}</span>
      </div>
      <ShotRow>{shots(84, 10).slice(0, 3)}</ShotRow>
      <div className="mx-4 mt-5 border-t pt-4" style={{ borderColor: colors.line }}>
        <div className="flex items-center gap-3 opacity-40">
          <div className="h-14 w-14 rounded-[13px]" style={{ background: colors.line }} />
          <div className="flex-1 space-y-1.5"><div className="h-3 w-28 rounded" style={{ background: colors.line }} /><div className="h-2.5 w-40 rounded" style={{ background: colors.line }} /></div>
        </div>
      </div>
    </div>
  );
}

function AppStoreProduct({ listing, colors, icon, shots }: PageProps) {
  const facts: Array<[string, ReactNode, ReactNode]> = [
    [`${listing.ratings} RATINGS`, listing.rating.toFixed(1), <Stars rating={listing.rating} size={9} color={colors.muted} />],
    ['AGE', '4+', 'Years Old'],
    ['CHART', 'No.1', listing.category],
    ['DEVELOPER', <UserRound size={18} />, listing.developer],
  ];
  return (
    <div className="pb-6">
      <div className="flex items-center px-2 pb-2 text-[15px]" style={{ color: colors.accent }}><ChevronLeft size={22} />Search</div>
      <div className="flex gap-3.5 px-4">
        {icon(100)}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="text-[19px] font-bold leading-tight">{listing.name}</div>
          <div className="mt-0.5 text-[13px] leading-snug" style={{ color: colors.muted }}>{listing.subtitle}</div>
          <div className="mt-auto flex items-center justify-between pt-2">
            <span className="rounded-full px-5 py-1 text-[14px] font-bold text-white" style={{ background: colors.accent }}>Get</span>
            <Share size={17} style={{ color: colors.accent }} />
          </div>
        </div>
      </div>
      <div className="mx-4 mt-4 grid grid-cols-4 border-y py-2.5" style={{ borderColor: colors.line }}>
        {facts.map(([label, value, detail], index) => (
          <div key={label} className="flex min-w-0 flex-col items-center gap-0.5 px-1 text-center" style={{ borderLeft: index ? `1px solid ${colors.line}` : undefined }}>
            <span className="truncate text-[8.5px] font-semibold tracking-wide" style={{ color: colors.muted }}>{label}</span>
            <span className="text-[17px] font-bold leading-tight" style={{ color: colors.muted }}>{value}</span>
            <span className="max-w-full truncate text-[9px]" style={{ color: colors.muted }}>{detail}</span>
          </div>
        ))}
      </div>
      <div className="pt-4"><ShotRow scroll>{shots(176, 18)}</ShotRow></div>
      <div className="mx-4 mt-4 space-y-1.5">
        <div className="text-[17px] font-bold">What’s New</div>
        <div className="h-2.5 w-full rounded" style={{ background: colors.line }} />
        <div className="h-2.5 w-4/5 rounded" style={{ background: colors.line }} />
      </div>
    </div>
  );
}

function PlaySearch({ listing, colors, icon, shots }: PageProps) {
  return (
    <div className="pb-6">
      <div className="mx-3 mb-4 flex h-11 items-center gap-3 rounded-full px-4 text-[15px]" style={{ background: colors.field }}>
        <ChevronLeft size={18} style={{ color: colors.muted }} />
        <span className="flex-1 truncate">{listing.name.toLowerCase()}</span>
        <Mic size={17} style={{ color: colors.muted }} />
      </div>
      <div className="flex items-center gap-3 px-4">
        {icon(60)}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium">{listing.name}</div>
          <div className="truncate text-[12.5px]" style={{ color: colors.muted }}>{listing.developer}</div>
          <div className="flex items-center gap-1 text-[12px]" style={{ color: colors.muted }}>{listing.rating.toFixed(1)} <Star size={10} fill="currentColor" stroke="none" /> · {listing.category}</div>
        </div>
      </div>
      <div className="mx-4 my-3 flex h-9 items-center justify-center rounded-full text-[13.5px] font-medium" style={{ background: colors.button, color: colors.bg === '#FFFFFF' ? '#FFFFFF' : '#0A3818' }}>Install</div>
      <ShotRow>{shots(84, 8).slice(0, 3)}</ShotRow>
    </div>
  );
}

function PlayProduct({ listing, colors, icon, shots }: PageProps) {
  return (
    <div className="pb-6">
      <div className="flex items-center justify-between px-3 pb-3" style={{ color: colors.muted }}><ChevronLeft size={20} /><span className="flex gap-4"><Search size={18} /><MoreVertical size={18} /></span></div>
      <div className="flex items-center gap-4 px-5">
        {icon(68)}
        <div className="min-w-0">
          <div className="text-[20px] font-medium leading-tight">{listing.name}</div>
          <div className="truncate text-[13px] font-medium" style={{ color: colors.accent }}>{listing.developer}</div>
          <div className="text-[11px]" style={{ color: colors.muted }}>In-app purchases</div>
        </div>
      </div>
      <div className="mx-5 mt-4 grid grid-cols-3 text-center">
        {[[<>{listing.rating.toFixed(1)} <Star size={10} fill="currentColor" stroke="none" className="inline -mt-0.5" /></>, `${listing.ratings} reviews`], ['1M+', 'Downloads'], [<span className="rounded-[2px] border border-current px-0.5 text-[10px]">E</span>, 'Everyone']].map(([value, label], index) => (
          <div key={index} className="flex flex-col items-center gap-0.5" style={{ borderLeft: index ? `1px solid ${colors.line}` : undefined }}>
            <span className="text-[13px] font-medium">{value}</span>
            <span className="text-[11px]" style={{ color: colors.muted }}>{label}</span>
          </div>
        ))}
      </div>
      <div className="mx-5 my-4 flex h-10 items-center justify-center rounded-full text-[14px] font-medium" style={{ background: colors.button, color: colors.bg === '#FFFFFF' ? '#FFFFFF' : '#0A3818' }}>Install</div>
      <ShotRow scroll>{shots(124, 10)}</ShotRow>
      <div className="mx-5 mt-5 space-y-1.5">
        <div className="text-[16px] font-medium">About this app</div>
        <div className="text-[12.5px] leading-snug" style={{ color: colors.muted }}>{listing.subtitle}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex flex-col gap-1"><span className="text-[11px] text-zinc-400">{label}</span>{children}</label>;
}

/** App Store and Google Play, as shoppers will see your screenshots: in search results and on the product page. */
export function StorePreview() {
  const project = useEditor((state) => state.project);
  const [store, setStore] = useState<Store>('app-store');
  const [theme, setTheme] = useState<Theme>('light');
  const [saving, setSaving] = useState(false);
  const phonesRef = useRef<HTMLDivElement>(null);
  const iconInput = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const listing = listingOf(project);
  const colors = PALETTE[store][theme];

  const output: OutputSpec = useMemo(() => (store === 'app-store'
    ? project.outputs.find((item) => item.store === 'app-store' && item.family === 'iphone') ?? outputById('ios-69')!
    : project.outputs.find((item) => item.store === 'play-store' && item.family === 'android-phone') ?? outputById('play-phone')!), [project.outputs, store]);
  const ids = useMemo(() => [
    ...project.slides.flatMap((slide) => slide.elements.flatMap((element) => (element.type === 'device' ? [element.screen.assetId] : []))),
    listing.iconAssetId,
  ], [project.slides, listing.iconAssetId]);
  const previewAssets = usePreviewAssets(project.assets, ids);
  const previewProject = useMemo(() => (previewAssets ? { ...project, assets: previewAssets } : null), [project, previewAssets]);
  const accent = useMemo(() => {
    const title = project.slides[0]?.elements.find((element) => element.type === 'text' && element.role === 'title');
    return title?.type === 'text' ? title.accent.color : '#6366F1';
  }, [project.slides]);

  const iconSrc = listing.iconAssetId ? (previewAssets ?? project.assets)[listing.iconAssetId]?.src : undefined;
  const icon = (size: number) => <AppIcon listing={listing} src={iconSrc} size={size} accent={accent} play={store === 'play'} />;
  const shots = (width: number, radius: number) => (previewProject
    ? previewProject.slides.map((slide, index) => (
      <div key={slide.id} style={{ scrollSnapAlign: 'start' }} className="shrink-0 shadow-[0_0_0_0.5px_rgba(0,0,0,0.12)]">
        <SlideThumb project={previewProject} slideIndex={index} output={output} width={width} radius={radius} />
      </div>
    ))
    : project.slides.map((slide) => <div key={slide.id} className="shrink-0 animate-pulse" style={{ width, height: (width * output.height) / output.width, borderRadius: radius, background: colors.line }} />));
  const page: PageProps = { listing, colors, icon, shots };

  const saveImage = async () => {
    const node = phonesRef.current;
    if (!node || saving) return;
    setSaving(true);
    try {
      const [{ toBlob }, { buildFontEmbedCSS }] = await Promise.all([import('html-to-image'), import('../export/fontEmbed')]);
      const fontEmbedCSS = await buildFontEmbedCSS(project).catch(() => '');
      const blob = await toBlob(node, { pixelRatio: 2, cacheBust: false, fontEmbedCSS, backgroundColor: '#0c0c0e' });
      if (!blob) throw new Error('empty');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${listing.name} — ${store === 'app-store' ? 'App Store' : 'Google Play'} preview.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      toast({ title: 'Could not save the preview', description: 'Try again, or take a screenshot instead.', tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[35] flex overflow-hidden bg-[#0c0c0e]">
      <div data-scrollable className="flex min-w-0 flex-1 flex-col items-center overflow-auto px-6 pb-28 pt-20">
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          <div className="w-[210px]"><Segmented<Store> options={[{ value: 'app-store', label: 'App Store' }, { value: 'play', label: 'Google Play' }]} value={store} onChange={setStore} size="md" fullWidth /></div>
          <div className="w-[130px]"><Segmented<Theme> options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} value={theme} onChange={setTheme} size="md" fullWidth /></div>
          <button type="button" onClick={() => void saveImage()} disabled={saving} className="flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-[12px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-50">
            <Download size={13} /> {saving ? 'Saving…' : 'Save image'}
          </button>
        </div>
        <div ref={phonesRef} key={`${store}-${theme}`} className="ff-fade flex flex-wrap items-start justify-center gap-10 p-4">
          {store === 'app-store' ? (
            <>
              <Phone colors={colors} label="Search results"><AppStoreSearch {...page} /></Phone>
              <Phone colors={colors} label="Product page"><AppStoreProduct {...page} /></Phone>
            </>
          ) : (
            <>
              <Phone colors={colors} label="Search results" play><PlaySearch {...page} /></Phone>
              <Phone colors={colors} label="Product page" play><PlayProduct {...page} /></Phone>
            </>
          )}
        </div>
      </div>

      <aside className="mb-4 mr-4 mt-4 flex w-[300px] shrink-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-white/[0.08] bg-zinc-900/95 p-4 shadow-[0_16px_50px_-12px_rgba(0,0,0,0.7)] max-[900px]:hidden" data-scrollable>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[13px] font-semibold text-white">Store listing</h2>
            <p className="text-[11px] text-zinc-500">See your screenshots where shoppers will.</p>
          </div>
          <button type="button" aria-label="Close preview" onClick={() => useEditor.getState().setMode('editor')} className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-white/[0.08] hover:text-white"><X size={15} /></button>
        </div>
        <div className="flex items-center gap-3">
          <AppIcon listing={listing} src={listing.iconAssetId ? project.assets[listing.iconAssetId]?.src : undefined} size={56} accent={accent} />
          <div className="flex flex-col gap-1">
            <button type="button" onClick={() => iconInput.current?.click()} className="flex h-7 items-center gap-1.5 rounded-md bg-white/[0.06] px-2.5 text-[12px] font-medium text-zinc-200 hover:bg-white/[0.1]"><ImagePlus size={13} /> {listing.iconAssetId ? 'Replace icon' : 'Add app icon'}</button>
            {listing.iconAssetId && <button type="button" onClick={() => updateListing({ iconAssetId: null })} className="self-start text-[11px] text-zinc-500 hover:text-zinc-200">Remove</button>}
          </div>
        </div>
        <Field label="App name"><TextInput value={listing.name} maxLength={30} onChange={(event) => updateListing({ name: event.target.value }, 'name')} /></Field>
        <Field label="Subtitle"><TextInput value={listing.subtitle} maxLength={30} onChange={(event) => updateListing({ subtitle: event.target.value }, 'subtitle')} /></Field>
        <Field label="Developer"><TextInput value={listing.developer} onChange={(event) => updateListing({ developer: event.target.value }, 'developer')} /></Field>
        <Field label="Category">
          <select value={listing.category} onChange={(event) => updateListing({ category: event.target.value })} className="h-7 w-full rounded-md border border-white/[0.08] bg-zinc-800/80 px-2 text-xs text-zinc-100 outline-none focus:border-indigo-500/60">
            {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Rating"><TextInput type="number" min={0} max={5} step={0.1} value={listing.rating} onChange={(event) => updateListing({ rating: Math.min(5, Math.max(0, Number(event.target.value) || 0)) }, 'rating')} /></Field>
          <Field label="Ratings"><TextInput value={listing.ratings} onChange={(event) => updateListing({ ratings: event.target.value }, 'ratings')} /></Field>
        </div>
        <p className="mt-1 rounded-lg bg-white/[0.03] p-2.5 text-[11px] leading-relaxed text-zinc-500">
          Shoppers see the first three screenshots in search, so put your strongest message first. App Store names and subtitles are limited to 30 characters.
        </p>
        <input
          ref={iconInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            const image = await readImageFile(file);
            const assetId = useEditor.getState().addAsset({ name: file.name, ...image });
            updateListing({ iconAssetId: assetId });
          }}
        />
      </aside>
    </div>
  );
}
