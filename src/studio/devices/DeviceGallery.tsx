import { type ReactElement } from 'react';
import type { DeviceElement } from '../model/types';
import { DEVICE_MODELS, type DeviceFinish, type DeviceModel } from './catalog';
import { DeviceFrame, deviceBoxSize } from './DeviceFrame';

const styles: DeviceElement['style'][] = ['clay', 'matte', 'outline', 'none'];
const galleryShadow = { enabled: true, x: 0, y: 11, blur: 20, spread: 0, color: '#000000', opacity: .5 };

function sample(
  modelId: string,
  style: DeviceElement['style'],
  finish: string,
  tiltY = 0,
  orientation: DeviceElement['orientation'] = 'portrait',
): DeviceElement {
  return {
    id: `${modelId}-${style}-${finish}-${tiltY}-${orientation}`,
    type: 'device',
    name: modelId,
    visible: true,
    locked: false,
    x: .5,
    y: .5,
    rotation: 0,
    opacity: 1,
    shadow: galleryShadow,
    model: modelId,
    h: .8,
    style,
    finish,
    tint: '#7773D8',
    orientation,
    screen: { assetId: null, fit: 'cover', position: 'center', background: '#E5E7EB' },
    tiltX: 0,
    tiltY,
    perspective: 1600,
    showButtons: true,
    glare: style === 'real' ? .22 : .08,
  };
}

function GalleryCard({ title, models, children }: {
  title: string;
  models?: DeviceFinish[];
  children: ReactElement;
}): ReactElement {
  return (
    <article style={{ border: '1px solid rgba(255,255,255,.09)', background: '#18181B', borderRadius: 12, padding: 14, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <strong style={{ fontSize: 13, fontWeight: 600 }}>{title}</strong>
        {models && <span style={{ fontSize: 10, color: '#71717A' }}>{models.length} finishes</span>}
      </div>
      {children}
    </article>
  );
}

function DevicePreview({ element, model, height, label }: {
  element: DeviceElement;
  model: DeviceModel;
  height: number;
  label: string;
}): ReactElement {
  const size = deviceBoxSize(model, element.orientation, height);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ width: size.width, height: size.height, position: 'relative' }}>
        <DeviceFrame element={element} model={model} width={size.width} height={size.height} unit={1} screenSrc={null} />
      </div>
      <span style={{ color: '#A1A1AA', fontSize: 9, whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

export function DeviceGallery(): ReactElement {
  const realRows = DEVICE_MODELS.map((model) => ({ model, finishes: model.finishes.slice(0, 2) }));
  const hero = DEVICE_MODELS.find((model) => model.id === 'iphone-16-pro-max') ?? DEVICE_MODELS[0];
  const tiltAngles = [-20, -10, 0, 10, 20];
  const landscapeModels = [
    DEVICE_MODELS.find((model) => model.id === 'iphone-16-pro') ?? hero,
    DEVICE_MODELS.find((model) => model.id === 'ipad-pro-13') ?? hero,
  ];

  return (
    <main style={{ minHeight: '100vh', background: '#111113', color: '#F4F4F5', padding: 30, fontFamily: 'Inter, ui-sans-serif, system-ui', overflow: 'auto' }}>
      <header style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ color: '#A1A1AA', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase' }}>Frameflow Studio / QA</div>
          <h1 style={{ margin: '6px 0 0', fontSize: 25, letterSpacing: '-.04em', fontWeight: 650 }}>Device finish gallery</h1>
        </div>
        <span style={{ color: '#71717A', fontSize: 12 }}>{DEVICE_MODELS.length} models · 5 frame styles</span>
      </header>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(480px,1fr))', gap: 12 }}>
        {realRows.map(({ model, finishes }) => (
          <GalleryCard key={model.id} title={model.name} models={model.finishes}>
            <div style={{ overflowX: 'auto', paddingBottom: 5 }}>
              <div style={{ display: 'flex', width: 'max-content', gap: 18, alignItems: 'end', minHeight: 280 }}>
                {finishes.map((finish) => (
                  <DevicePreview key={finish.id} model={model} height={260} label={finish.name} element={sample(model.id, 'real', finish.id)} />
                ))}
              </div>
            </div>
          </GalleryCard>
        ))}
        {styles.map((style) => (
          <GalleryCard key={style} title={`iPhone 16 Pro Max · ${style}`}>
            <div style={{ display: 'flex', alignItems: 'end', gap: 28, minHeight: 190, overflowX: 'auto' }}>
              {hero.finishes.slice(0, 2).map((finish) => (
                <DevicePreview key={finish.id} model={hero} height={166} label={finish.name} element={sample(hero.id, style, finish.id)} />
              ))}
            </div>
          </GalleryCard>
        ))}
        <GalleryCard title="Tilt · iPhone 16 Pro Max">
          <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-around', gap: 18, minHeight: 210, overflowX: 'auto' }}>
            {tiltAngles.map((tilt) => (
              <DevicePreview key={tilt} model={hero} height={150} label={`${tilt}°`} element={sample(hero.id, 'real', hero.finishes[0].id, tilt)} />
            ))}
          </div>
        </GalleryCard>
        <GalleryCard title="Landscape · iPhone & iPad">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 30, minHeight: 210, overflowX: 'auto' }}>
            {landscapeModels.map((model) => (
              <DevicePreview key={model.id} model={model} height={150} label={model.name} element={sample(model.id, 'real', model.finishes[0].id, 0, 'landscape')} />
            ))}
          </div>
        </GalleryCard>
      </section>
    </main>
  );
}
