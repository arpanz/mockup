import { useMemo, useState } from 'react';
import { createImage } from '../model/defaults';
import { useEditor } from '../store/editorStore';
import { TextInput } from '../ui';
import { STICKERS, STICKER_COLORS, stickerDataUrl } from './catalog';

/** Dark stickers preview on a light tile and light ones on a dark tile, so every color stays visible. */
function isDark(hex: string) {
  const [r, g, b] = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.45;
}

export function StickerPicker({ slideId, onDone }: { slideId: string; onDone: () => void }) {
  const [color, setColor] = useState(STICKER_COLORS[0]);
  const [selectedId, setSelectedId] = useState(STICKERS[0].id);
  const [text, setText] = useState(() => Object.fromEntries(STICKERS.flatMap((sticker) => sticker.fields.map((field) => [`${sticker.id}.${field.key}`, field.value]))));
  const selected = STICKERS.find((sticker) => sticker.id === selectedId) ?? STICKERS[0];
  const values = (sticker: typeof selected) => Object.fromEntries(sticker.fields.map((field) => [field.key, text[`${sticker.id}.${field.key}`] ?? field.value]));
  const previews = useMemo(() => Object.fromEntries(STICKERS.map((sticker) => [sticker.id, stickerDataUrl(sticker.svg(color, values(sticker)))])), [color, text]);

  const insert = (sticker: typeof selected) => {
    const store = useEditor.getState();
    const svg = sticker.svg(color, values(sticker));
    const assetId = store.addAsset({ name: `${sticker.name}.svg`, src: stickerDataUrl(svg), width: sticker.width, height: sticker.height });
    const scale = 360 / Math.max(sticker.width, sticker.height);
    store.addElement(slideId, createImage(assetId, Math.round(sticker.width * scale), Math.round(sticker.height * scale), { name: sticker.name, x: 0.5, y: 0.3, fit: 'contain' }));
    onDone();
  };

  return (
    <div className="w-[340px] space-y-3 p-3">
      <div className="text-[12px] font-semibold text-zinc-200">Stickers</div>
      <div className="flex items-center gap-2">
        {STICKER_COLORS.map((swatch) => (
          <button key={swatch} type="button" aria-label={`Sticker color ${swatch}`} aria-pressed={color === swatch} onClick={() => setColor(swatch)} className={`h-[22px] w-[22px] rounded-full border border-white/20 ${color === swatch ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-zinc-900' : ''}`} style={{ backgroundColor: swatch }} />
        ))}
      </div>
      {selected.fields.length > 0 && (
        <div className="space-y-2">
          {selected.fields.map((field) => (
            <label key={field.key} className="block space-y-1 text-[11px] text-zinc-400">
              <span>{field.label}</span>
              <TextInput value={text[`${selected.id}.${field.key}`] ?? field.value} onChange={(event) => setText((current) => ({ ...current, [`${selected.id}.${field.key}`]: event.target.value }))} />
            </label>
          ))}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {STICKERS.map((sticker) => (
          <button key={sticker.id} type="button" aria-label={sticker.name} aria-pressed={selectedId === sticker.id} onClick={() => setSelectedId(sticker.id)} onDoubleClick={() => insert(sticker)} className={`flex h-20 items-center justify-center rounded-lg ${isDark(color) ? 'bg-zinc-100 hover:bg-white' : color.toUpperCase() === '#FFFFFF' ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-white/[0.04] hover:bg-white/[0.08]'} p-2 transition-colors ${selectedId === sticker.id ? 'ring-1 ring-indigo-400' : ''}`}>
            <img src={previews[sticker.id]} alt={sticker.name} className="h-full w-full object-contain" />
          </button>
        ))}
      </div>
      <button type="button" onClick={() => insert(selected)} className="h-8 w-full rounded-md bg-indigo-500 text-[12px] font-semibold text-white transition-colors hover:bg-indigo-400">Add to screenshot</button>
    </div>
  );
}
