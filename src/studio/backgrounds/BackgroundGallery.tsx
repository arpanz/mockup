import type { ReactElement } from 'react';
import { BACKGROUND_PRESETS } from './presets';
import { PATTERN_REGISTRY } from './patterns';
import { BackgroundLayer } from './BackgroundLayer';

const resolveAsset = () => undefined;
const groups = ['Gradients', 'Mesh', 'Dark', 'Patterns', 'Solid'] as const;

export function BackgroundGallery(): ReactElement {
  return <main style={{
    minHeight: '100vh',
    background: '#09090B',
    color: '#F4F4F5',
    padding: 32,
    fontFamily: 'Inter, ui-sans-serif, system-ui',
  }}>
    <header style={{ marginBottom: 28 }}>
      <div style={{ color: '#818CF8', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' }}>
        Frameflow Studio v2 · QA
      </div>
      <h1 style={{ fontSize: 24, margin: '8px 0' }}>Background library</h1>
      <p style={{ color: '#A1A1AA', fontSize: 13, margin: 0 }}>
        {BACKGROUND_PRESETS.length} curated presets · {PATTERN_REGISTRY.length} scalable patterns
      </p>
    </header>
    {groups.map((group) => <section key={group} style={{ marginBottom: 30 }}>
      <h2 style={{ fontSize: 14, color: '#D4D4D8', marginBottom: 12 }}>{group}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 12 }}>
        {BACKGROUND_PRESETS.filter((preset) => preset.group === group).map((preset) => <article key={preset.id} style={{
          background: '#18181B', border: '1px solid #ffffff12', borderRadius: 10, padding: 8,
        }}>
          <div style={{
            width: 74, height: 120, margin: '0 auto', position: 'relative', overflow: 'hidden', borderRadius: 7,
          }}>
            <BackgroundLayer background={preset.background} width={74} height={160} unit={0.074} resolveAsset={resolveAsset} />
          </div>
          <div style={{ fontSize: 11, color: '#D4D4D8', padding: '8px 2px 1px', textAlign: 'center' }}>
            {preset.name}
          </div>
        </article>)}
      </div>
    </section>)}
    <section>
      <h2 style={{ fontSize: 14, color: '#D4D4D8', marginBottom: 12 }}>Pattern detail</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        {PATTERN_REGISTRY.map((pattern) => <article key={pattern.id} style={{
          background: '#18181B', border: '1px solid #ffffff12', borderRadius: 10, padding: 10,
        }}>
          <div style={{
            width: 166, height: 360, margin: '0 auto', overflow: 'hidden', borderRadius: 7, position: 'relative',
          }}>
            <BackgroundLayer
              background={{
                kind: 'pattern', patternId: pattern.id, base: '#111827', colors: pattern.defaultColors,
                scale: 1, noise: 0.04,
              }}
              width={166}
              height={360}
              unit={0.166}
              resolveAsset={resolveAsset}
            />
          </div>
          <div style={{ fontSize: 11, color: '#D4D4D8', padding: '9px 2px 0' }}>
            {pattern.name} <span style={{ color: '#71717A' }}>· {pattern.id}</span>
          </div>
        </article>)}
      </div>
    </section>
  </main>;
}
