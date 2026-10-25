import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { Check, Search } from 'lucide-react';
import { FONT_CATALOG, FONT_PAIRINGS, type FontDef } from './fontCatalog';
import { fontStack, loadFont } from './fontLoader';

export interface FontPickerProps {
  value: string;
  weight: number;
  onChange: (family: string, weight: number) => void;
  onClose?: () => void;
  onPairing?: (pairing: (typeof FONT_PAIRINGS)[number]) => void;
}

const categories = ['All', 'Sans', 'Display', 'Serif', 'Rounded', 'Mono', 'Handwriting'] as const;
const panel: CSSProperties = {
  width: 300,
  maxHeight: 420,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  background: '#18181b',
  color: '#f4f4f5',
  border: '1px solid rgba(255,255,255,.1)',
  borderRadius: 12,
  font: '12px Inter, sans-serif',
};
const button: CSSProperties = {
  color: '#a1a1aa',
  background: '#27272a',
  border: '1px solid rgba(255,255,255,.08)',
  borderRadius: 8,
  padding: '5px 8px',
  cursor: 'pointer',
  fontSize: 11,
};

export function FontPicker({ value, weight, onChange, onClose, onPairing }: FontPickerProps): ReactElement {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number]>('All');
  const [tab, setTab] = useState<'Fonts' | 'Pairings'>('Fonts');
  const [active, setActive] = useState(value);
  const [selectedWeight, setSelectedWeight] = useState(weight);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const options = useMemo(() => FONT_CATALOG.filter((font) => {
    const matchesQuery = `${font.family} ${font.tags?.join(' ') ?? ''}`
      .toLowerCase()
      .includes(query.toLowerCase());
    return matchesQuery && (category === 'All' || font.category.toLowerCase() === category.toLowerCase());
  }), [category, query]);

  useEffect(() => inputRef.current?.focus(), []);
  useEffect(() => {
    const root = listRef.current;
    if (!root || tab !== 'Fonts') return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const family = (entry.target as HTMLElement).dataset.family;
        if (family) void loadFont(family);
      }
    }, { root, rootMargin: '100px' });
    root.querySelectorAll('[data-family]').forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  }, [options, tab]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (tab !== 'Fonts' || options.length === 0) return;
      const index = options.findIndex((font) => font.family === active);
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        const next = (index + delta + options.length) % options.length;
        setActive(options[next].family);
        listRef.current
          ?.querySelector(`[data-family="${CSS.escape(options[next].family)}"]`)
          ?.scrollIntoView({ block: 'nearest' });
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const font = options.find((item) => item.family === active);
        if (font) onChange(font.family, font.weights.includes(selectedWeight) ? selectedWeight : font.weights[0]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, onChange, onClose, options, selectedWeight, tab]);

  const choose = (font: FontDef) => {
    const nextWeight = font.weights.includes(selectedWeight) ? selectedWeight : font.weights[0];
    setActive(font.family);
    setSelectedWeight(nextWeight);
    onChange(font.family, nextWeight);
  };
  const selected = FONT_CATALOG.find((font) => font.family === value);

  return (
    <div style={panel}>
      <div style={{ display: 'flex', padding: 8, gap: 6, borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        {(['Fonts', 'Pairings'] as const).map((name) => (
          <button
            key={name}
            onClick={() => setTab(name)}
            style={{
              ...button,
              color: tab === name ? '#fff' : '#a1a1aa',
              background: tab === name ? '#3f3f46' : 'transparent',
            }}
          >
            {name}
          </button>
        ))}
      </div>
      {tab === 'Fonts' ? (
        <>
          <div style={{ position: 'relative', padding: 8 }}>
            <Search size={14} style={{ position: 'absolute', left: 16, top: 16, color: '#71717a' }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search fonts"
              style={{
                boxSizing: 'border-box',
                width: '100%',
                padding: '8px 8px 8px 28px',
                borderRadius: 8,
                background: '#27272a',
                border: '1px solid rgba(255,255,255,.1)',
                color: '#f4f4f5',
                outline: 'none',
                fontSize: 12,
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 4, padding: '0 8px 8px', overflowX: 'auto' }}>
            {categories.map((item) => (
              <button
                key={item}
                style={{
                  ...button,
                  whiteSpace: 'nowrap',
                  color: category === item ? '#c7d2fe' : '#a1a1aa',
                  background: category === item ? 'rgba(99,102,241,.2)' : '#27272a',
                }}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div ref={listRef} style={{ overflowY: 'auto', minHeight: 0, padding: '0 6px' }}>
            {options.map((font) => (
              <button
                key={font.family}
                data-family={font.family}
                onClick={() => choose(font)}
                onMouseEnter={() => setActive(font.family)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  width: '100%',
                  height: 36,
                  padding: '0 8px',
                  border: 0,
                  borderRadius: 7,
                  background: font.family === active ? '#27272a' : 'transparent',
                  color: '#f4f4f5',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ flex: 1, fontFamily: fontStack(font.family), fontSize: 16 }}>{font.family}</span>
                {font.family === value ? <Check size={14} color="#818cf8" /> : null}
              </button>
            ))}
          </div>
          {selected ? (
            <div style={{ display: 'flex', gap: 5, padding: 8, borderTop: '1px solid rgba(255,255,255,.08)' }}>
              {selected.weights.map((itemWeight) => (
                <button
                  key={itemWeight}
                  onClick={() => {
                    setSelectedWeight(itemWeight);
                    onChange(value, itemWeight);
                  }}
                  style={{
                    ...button,
                    color: selectedWeight === itemWeight ? '#c7d2fe' : '#a1a1aa',
                    background: selectedWeight === itemWeight ? 'rgba(99,102,241,.2)' : '#27272a',
                    fontFamily: fontStack(value),
                    fontWeight: itemWeight,
                  }}
                >
                  {itemWeight}
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <div style={{ overflowY: 'auto', padding: 8 }}>
          {FONT_PAIRINGS.map((pairing) => (
            <button
              key={pairing.id}
              onClick={() => {
                onPairing?.(pairing);
                onChange(pairing.title.family, pairing.title.weight);
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: 10,
                marginBottom: 6,
                border: '1px solid rgba(255,255,255,.08)',
                borderRadius: 8,
                background: '#27272a',
                color: '#f4f4f5',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 10, color: '#a1a1aa', marginBottom: 4 }}>{pairing.name}</div>
              <div style={{ fontFamily: fontStack(pairing.title.family), fontWeight: pairing.title.weight, fontSize: 19 }}>
                {pairing.title.family}
              </div>
              <div style={{ fontFamily: fontStack(pairing.body.family), fontWeight: pairing.body.weight, fontSize: 13 }}>
                {pairing.body.family}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
