import { createDevice, createProject, createText, makeId, solid } from './defaults';
import type { Asset, Project, Slide } from './types';

interface ScreenPalette {
  bg: string;
  card: string;
  ink: string;
  muted: string;
  accent: string;
  soft: string;
  title: string;
}

const PALETTES: ScreenPalette[] = [
  { bg: '#F8FAFC', card: '#FFFFFF', ink: '#0F172A', muted: '#64748B', accent: '#4F46E5', soft: '#E0E7FF', title: 'Overview' },
  { bg: '#0B1120', card: '#151E32', ink: '#F8FAFC', muted: '#94A3B8', accent: '#38BDF8', soft: '#1E3A5F', title: 'Insights' },
  { bg: '#FFF7ED', card: '#FFFFFF', ink: '#1C1917', muted: '#78716C', accent: '#F97316', soft: '#FFEDD5', title: 'Activity' },
  { bg: '#F0FDF4', card: '#FFFFFF', ink: '#052E16', muted: '#4B7A5C', accent: '#16A34A', soft: '#DCFCE7', title: 'Goals' },
];

/** A believable app screen as an SVG data URL (1290 × 2796, iPhone 6.9″ screen ratio). */
function demoScreen(palette: ScreenPalette, variant: number): string {
  const p = palette;
  const bars = [0.82, 0.58, 0.9, 0.44, 0.7, 0.96, 0.62];
  const chart = bars
    .map((value, index) => {
      const height = 360 * value;
      return `<rect x="${130 + index * 150}" y="${1560 - height}" width="86" height="${height}" rx="28" fill="${p.accent}" opacity="${0.35 + value * 0.6}"/>`;
    })
    .join('');
  const rows = [0, 1, 2]
    .map((index) => {
      const y = 1780 + index * 250;
      return `
        <rect x="72" y="${y}" width="1146" height="210" rx="56" fill="${p.card}"/>
        <rect x="120" y="${y + 50}" width="110" height="110" rx="34" fill="${p.soft}"/>
        <rect x="270" y="${y + 62}" width="${420 - index * 60}" height="34" rx="17" fill="${p.ink}" opacity=".85"/>
        <rect x="270" y="${y + 120}" width="${300 + index * 40}" height="26" rx="13" fill="${p.muted}" opacity=".45"/>
        <rect x="${1000 - index * 20}" y="${y + 80}" width="${150 + index * 20}" height="44" rx="22" fill="${p.accent}" opacity=".9"/>`;
    })
    .join('');
  const amount = ['$24,890', '87.4%', '12,480', '18 / 21'][variant % 4];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1290" height="2796" viewBox="0 0 1290 2796">
    <rect width="1290" height="2796" fill="${p.bg}"/>
    <text x="120" y="135" fill="${p.ink}" font-family="Inter, Arial" font-size="50" font-weight="600">9:41</text>
    <rect x="1040" y="100" width="92" height="44" rx="14" fill="none" stroke="${p.ink}" stroke-width="5" opacity=".9"/>
    <rect x="1050" y="110" width="66" height="24" rx="7" fill="${p.ink}"/>
    <text x="72" y="380" fill="${p.ink}" font-family="Inter, Arial" font-size="96" font-weight="800">${p.title}</text>
    <circle cx="1160" cy="350" r="58" fill="${p.soft}"/>
    <rect x="72" y="470" width="1146" height="560" rx="72" fill="${p.accent}"/>
    <text x="150" y="600" fill="#FFFFFF" opacity=".75" font-family="Inter, Arial" font-size="40" font-weight="700" letter-spacing="4">THIS MONTH</text>
    <text x="150" y="760" fill="#FFFFFF" font-family="Inter, Arial" font-size="150" font-weight="800">${amount}</text>
    <path d="M150 920 C290 820 400 960 530 860 S770 820 880 900 S1060 780 1140 800" fill="none" stroke="#FFFFFF" stroke-width="14" stroke-linecap="round" opacity=".7"/>
    <rect x="72" y="1090" width="1146" height="560" rx="72" fill="${p.card}"/>
    <text x="130" y="1180" fill="${p.ink}" font-family="Inter, Arial" font-size="48" font-weight="700">Weekly trend</text>
    ${chart}
    ${rows}
    <rect x="72" y="2560" width="1146" height="170" rx="85" fill="${p.card}"/>
    <circle cx="250" cy="2645" r="34" fill="${p.accent}"/>
    <circle cx="520" cy="2645" r="26" fill="${p.soft}"/>
    <circle cx="770" cy="2645" r="26" fill="${p.soft}"/>
    <circle cx="1040" cy="2645" r="26" fill="${p.soft}"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function createDemoAssets(): Asset[] {
  return PALETTES.map((palette, index) => ({
    id: makeId(),
    name: `${palette.title}.svg`,
    src: demoScreen(palette, index),
    width: 1290,
    height: 2796,
  }));
}

/** A showcase project exercising the editor: accents, badge, tilted device, two overlapping devices. */
export function createDemoProject(): Project {
  const project = createProject();
  const assets = createDemoAssets();
  project.name = 'Finly — App Store';
  project.assets = Object.fromEntries(assets.map((asset) => [asset.id, asset]));

  const slide = (name: string, background: Slide['background'], elements: Slide['elements']): Slide => ({
    id: makeId(), name, background, elements, overrides: {},
  });

  project.slides = [
    slide('Organized', { kind: 'linear', angle: 180, stops: [{ color: '#EEF2FF', position: 0 }, { color: '#FFFFFF', position: 1 }], noise: 0 }, [
      createText('title', { text: 'Your money,\n*sorted.*' }),
      createText('subtitle', { text: 'Budgets, goals and insights in one calm place.' }),
      createDevice({ screen: { assetId: assets[0].id, fit: 'cover', position: 'top', background: '#FFFFFF' } }),
    ]),
    slide('Insights', { kind: 'linear', angle: 160, stops: [{ color: '#0B1120', position: 0 }, { color: '#1E1B4B', position: 1 }], noise: 0.06 }, [
      createText('title', {
        text: 'See the *signal*,\nnot the noise',
        fill: solid('#F8FAFC'),
        accent: { style: 'highlight', color: '#38BDF8', textColor: '#0B1120', paint: solid('#38BDF8') },
      }),
      createText('subtitle', { text: 'Clear charts that tell you what changed and why.', fill: solid('#94A3B8') }),
      createDevice({ screen: { assetId: assets[1].id, fit: 'cover', position: 'top', background: '#0B1120' }, finish: 'black-titanium', tiltY: -14, tiltX: 4, rotation: 0 }),
    ]),
    slide('Activity', { kind: 'linear', angle: 180, stops: [{ color: '#FFF7ED', position: 0 }, { color: '#FFEDD5', position: 1 }], noise: 0 }, [
      createText('badge', { text: 'New', y: 0.05, plate: { enabled: true, paint: solid('#F97316'), radius: 999, padX: 20, padY: 10, stroke: { enabled: false, width: 2, color: '#000000', opacity: 1 } } }),
      createText('title', { text: 'Every move,\n*tracked* for you', y: 0.125, accent: { style: 'underline', color: '#F97316', textColor: '#FFFFFF', paint: solid('#F97316') } }),
      createText('subtitle', { text: 'Smart categories learn how you spend.', y: 0.215 }),
      createDevice({ screen: { assetId: assets[3].id, fit: 'cover', position: 'top', background: '#FFFFFF' }, x: 0.33, y: 0.74, h: 0.72, rotation: -6 }),
      createDevice({ screen: { assetId: assets[2].id, fit: 'cover', position: 'top', background: '#FFFFFF' }, x: 0.69, y: 0.71, h: 0.72, rotation: 5 }),
    ]),
  ];
  return project;
}
