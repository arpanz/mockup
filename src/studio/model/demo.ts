import { createDevice, createProject, createText, makeId, solid } from './defaults';
import type { Asset, Project, Slide } from './types';

/** Sample app screens, pre-rendered from ./sampleScreenArt (real screenshots are raster, so samples are too). */
const SAMPLES = ['Today', 'Calendar', 'Habits', 'Insights'];

export function createDemoAssets(): Asset[] {
  return SAMPLES.map((name) => ({
    id: makeId(),
    name: `${name}.webp`,
    src: `/samples/${name.toLowerCase()}.webp`,
    width: 1290,
    height: 2796,
  }));
}

/** A showcase project exercising the editor: accents, badge, tilted device, two overlapping devices. */
export function createDemoProject(): Project {
  const project = createProject();
  const assets = createDemoAssets();
  project.name = 'Focus — App Store';
  project.assets = Object.fromEntries(assets.map((asset) => [asset.id, asset]));

  const slide = (name: string, background: Slide['background'], elements: Slide['elements']): Slide => ({
    id: makeId(), name, background, elements, overrides: {},
  });

  project.slides = [
    slide('Organized', { kind: 'linear', angle: 180, stops: [{ color: '#EEF2FF', position: 0 }, { color: '#FFFFFF', position: 1 }], noise: 0 }, [
      createText('title', { text: 'Your day,\n*sorted.*' }),
      createText('subtitle', { text: 'Tasks, calendar and habits in one calm place.' }),
      createDevice({ screen: { assetId: assets[0].id, fit: 'cover', position: 'top', background: '#FFFFFF' } }),
    ]),
    slide('Insights', { kind: 'linear', angle: 160, stops: [{ color: '#0B1120', position: 0 }, { color: '#1E1B4B', position: 1 }], noise: 0.06 }, [
      createText('title', {
        text: 'Plan the day,\n*own* the hours',
        fill: solid('#F8FAFC'),
        accent: { style: 'highlight', color: '#38BDF8', textColor: '#0B1120', paint: solid('#38BDF8') },
      }),
      createText('subtitle', { text: 'A calendar that protects your focus time.', fill: solid('#94A3B8') }),
      createDevice({ screen: { assetId: assets[1].id, fit: 'cover', position: 'top', background: '#0B1120' }, finish: 'black-titanium', tiltY: -14, tiltX: 4, rotation: 0 }),
    ]),
    slide('Activity', { kind: 'linear', angle: 180, stops: [{ color: '#FFF7ED', position: 0 }, { color: '#FFEDD5', position: 1 }], noise: 0 }, [
      createText('badge', { text: 'New', y: 0.05, plate: { enabled: true, paint: solid('#F97316'), radius: 999, padX: 20, padY: 10, stroke: { enabled: false, width: 2, color: '#000000', opacity: 1 } } }),
      createText('title', { text: 'Every habit,\n*tracked* for you', y: 0.125, accent: { style: 'underline', color: '#F97316', textColor: '#FFFFFF', paint: solid('#F97316') } }),
      createText('subtitle', { text: 'Streaks and insights that keep you going.', y: 0.215 }),
      createDevice({ screen: { assetId: assets[3].id, fit: 'cover', position: 'top', background: '#FFFFFF' }, x: 0.33, y: 0.74, h: 0.72, rotation: -6 }),
      createDevice({ screen: { assetId: assets[2].id, fit: 'cover', position: 'top', background: '#FFFFFF' }, x: 0.69, y: 0.71, h: 0.72, rotation: 5 }),
    ]),
  ];
  return project;
}
