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
  const items: Array<[string, Parameters<typeof createDevice>[0]]> = [
    ['iphone-16-pro-max', { style: 'real', finish: 'natural-titanium' }],
    ['iphone-16-pro-max', { style: 'real', finish: 'black-titanium', tiltY: -18, tiltX: 6 }],
    ['pixel-9-pro', { style: 'real' }],
    ['ipad-pro-13', { style: 'real' }],
    ['iphone-16-pro-max', { style: 'clay', tint: '#F4D7C8' }],
    ['macbook-pro-14', { style: 'real' }],
    ['browser', { style: 'real' }],
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48, padding: 48, background: 'linear-gradient(#e0e7ff, #fff)' }}>
      {items.map(([id, patch], index) => {
        const model = getDeviceModel(id);
        if (!model) return <div key={index} style={{ color: 'red' }}>missing {id}</div>;
        const element = createDevice(patch);
        const box = deviceBoxSize(model, element.orientation, 640);
        return <div key={index} style={{ width: box.width, height: box.height, position: 'relative' }}><DeviceFrame element={element} model={model} width={box.width} height={box.height} unit={1} screenSrc={null} /></div>;
      })}
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
