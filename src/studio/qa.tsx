import type { ReactElement } from 'react';
import { BackgroundGallery } from './backgrounds/BackgroundGallery';
import { DeviceGallery } from './devices/DeviceGallery';
import { TypeSpecimen } from './text/TypeSpecimen';
import { TemplateGallery } from './templates/TemplateGallery';
import { DeviceFrame, deviceBoxSize } from './devices/DeviceFrame';
import { getDeviceModel } from './devices/catalog';
import { createDevice } from './model/defaults';
import Showcase from './ui/Showcase';

/** Dev-only QA pages, reachable at #qa-devices, #qa-type, #qa-ui, #qa-bg, #qa-device-big, #qa-templates. */
function BigDevices() {
  const cell = (key: string, modelId: string, patch: Parameters<typeof createDevice>[0], size = 300) => {
    const model = getDeviceModel(modelId);
    if (!model) return <div key={key} style={{ color: 'red' }}>missing {modelId}</div>;
    const element = createDevice({ shadow: { enabled: true, x: 0, y: 20, blur: 40, spread: 0, color: '#0F172A', opacity: 0.25 }, ...patch });
    const box = deviceBoxSize(model, element.orientation, size);
    return (
      <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ width: box.width, height: box.height, position: 'relative' }}>
          <DeviceFrame element={element} model={model} width={box.width} height={box.height} unit={size / 1000} screenSrc={null} />
        </div>
        <span style={{ font: '500 12px Inter, system-ui', color: '#475569' }}>{key}</span>
      </div>
    );
  };
  const models = ['iphone-16-pro-max', 'iphone-16', 'iphone-se', 'pixel-9-pro', 'galaxy-s24-ultra', 'ipad-pro-13', 'galaxy-tab-s9', 'macbook-pro-14', 'browser'];
  const styles = ['real', 'clay', 'matte', 'outline', 'minimal', 'glass', 'none'] as const;
  const tilts: Array<[string, Parameters<typeof createDevice>[0]]> = [
    ['left', { tiltX: 4, tiltY: 18 }], ['right', { tiltX: 4, tiltY: -18 }], ['hero', { tiltX: 12, tiltY: -22, rotation: 4 }], ['steep', { tiltX: 8, tiltY: 34 }],
  ];
  const row = { display: 'flex', flexWrap: 'wrap' as const, gap: 40, alignItems: 'flex-end' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 64, padding: 48, background: 'linear-gradient(#e0e7ff, #fff)' }}>
      <div style={row}>{models.map((id) => cell(id, id, { style: 'real' }, id.startsWith('ipad') || id.startsWith('galaxy-tab') || id === 'macbook-pro-14' || id === 'browser' ? 360 : 300))}</div>
      <div style={row}>{styles.map((style) => cell(style, 'iphone-16-pro-max', { style, tint: style === 'glass' ? '#FFFFFF' : style === 'outline' ? '#FFFFFF' : style === 'minimal' ? '#0A0A0A' : '#E5E7EB' }))}</div>
      <div style={row}>{tilts.map(([name, patch]) => cell(`real ${name}`, 'iphone-16-pro-max', { style: 'real', finish: 'black-titanium', ...patch }))}</div>
      <div style={row}>{tilts.map(([name, patch]) => cell(`clay ${name}`, 'iphone-16-pro-max', { style: 'clay', ...patch }))}</div>
      <div style={row}>{tilts.slice(0, 2).map(([name, patch]) => cell(`ipad ${name}`, 'ipad-pro-13', { style: 'real', ...patch }, 360))}{cell('minimal left', 'iphone-16-pro-max', { style: 'minimal' as never, tint: '#0A0A0A', tiltX: 4, tiltY: 18 })}</div>
    </div>
  );
}

export const QA_PAGES: Record<string, () => ReactElement> = {
  'qa-devices': DeviceGallery,
  'qa-type': TypeSpecimen,
  'qa-ui': Showcase,
  'qa-bg': BackgroundGallery,
  'qa-device-big': BigDevices,
  'qa-templates': TemplateGallery,
};

export function QaRouter({ page }: { page: string }) {
  const Page = QA_PAGES[page];
  if (!Page) return null;
  return (
    <div style={{ height: '100dvh', overflow: 'auto', background: '#0c0c0e' }}>
      <Page />
    </div>
  );
}
