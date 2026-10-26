import type { DeviceElement, DeviceFamily } from '../model/types';

export interface DeviceFinish {
  id: string;
  name: string;
  body: string;
  edge: string;
  highlight: string;
  shadow: string;
}

export interface DeviceModel {
  id: string;
  name: string;
  family: DeviceFamily;
  kind: 'phone' | 'tablet' | 'laptop' | 'browser';
  aspect: number;
  screen: { left: number; top: number; width: number; height: number; radius: number };
  bodyRadius: number;
  cutout: 'dynamic-island' | 'notch' | 'punch-hole' | 'home-button' | 'none';
  finishes: DeviceFinish[];
  buttons: Array<{ side: 'left' | 'right' | 'top'; offset: number; length: number }>;
  screenAspect: number;
}

const titanium: DeviceFinish[] = [
  { id: 'black-titanium', name: 'Black Titanium', body: '#343538', edge: '#77797D', highlight: '#D6D7D9', shadow: '#101113' },
  { id: 'white-titanium', name: 'White Titanium', body: '#D7D6D2', edge: '#F4F2ED', highlight: '#FFFFFF', shadow: '#777671' },
  { id: 'natural-titanium', name: 'Natural Titanium', body: '#AAA69E', edge: '#E3DED4', highlight: '#FBF8EF', shadow: '#5D5A54' },
  { id: 'desert-titanium', name: 'Desert Titanium', body: '#B9A99B', edge: '#E9D7C7', highlight: '#FFF2E4', shadow: '#68574C' },
];

const aluminum: DeviceFinish[] = [
  { id: 'space-black', name: 'Space Black', body: '#353638', edge: '#85868A', highlight: '#D7D8DA', shadow: '#111214' },
  { id: 'silver', name: 'Silver', body: '#C6C7C9', edge: '#F7F8FA', highlight: '#FFFFFF', shadow: '#77797D' },
];

const phoneButtons: DeviceModel['buttons'] = [
  { side: 'left', offset: .19, length: .045 },
  { side: 'left', offset: .25, length: .033 },
  { side: 'left', offset: .30, length: .033 },
  { side: 'right', offset: .23, length: .09 },
];

const tabletButtons: DeviceModel['buttons'] = [
  { side: 'top', offset: .13, length: .055 },
  { side: 'right', offset: .18, length: .08 },
];

function phone(
  id: string,
  name: string,
  family: DeviceFamily,
  aspect: number,
  screen: DeviceModel['screen'],
  bodyRadius: number,
  cutout: DeviceModel['cutout'],
  finishes: DeviceFinish[],
  screenAspect: number,
  buttons: DeviceModel['buttons'] = phoneButtons,
): DeviceModel {
  if (cutout !== 'home-button') {
    // All-screen phones have an even bezel; solve it so the display matches the screenshot aspect exactly.
    const heightInWidths = 1 / aspect;
    const bezel = (1 - screenAspect * heightInWidths) / (2 * (1 - screenAspect));
    screen = { left: bezel, width: 1 - 2 * bezel, top: bezel * aspect, height: 1 - 2 * bezel * aspect, radius: Math.max(.02, bodyRadius - bezel) };
  }
  return { id, name, family, kind: 'phone', aspect, screen, bodyRadius, cutout, finishes, screenAspect, buttons };
}

function tablet(
  id: string,
  name: string,
  family: DeviceFamily,
  aspect: number,
  screen: DeviceModel['screen'],
  cutout: DeviceModel['cutout'],
  screenAspect: number,
): DeviceModel {
  // Portrait body (width / height). Derive the screen's height from its true aspect so
  // screenshots fill it exactly and the bezel is even on all four sides.
  const bodyAspect = aspect > 1 ? 1 / aspect : aspect;
  const screenHeight = (screen.width * bodyAspect) / screenAspect;
  // Radii are fractions of the body width; keep the physical size when the input was landscape.
  const radiusScale = aspect > 1 ? aspect : 1;
  return {
    id, name, family, kind: 'tablet', aspect: bodyAspect,
    screen: { ...screen, height: screenHeight, top: (1 - screenHeight) / 2, radius: screen.radius * radiusScale },
    bodyRadius: .052 * radiusScale, cutout,
    finishes: aluminum, screenAspect, buttons: tabletButtons,
  };
}

const iphone16Finishes: DeviceFinish[] = [
  { id: 'black', name: 'Black', body: '#29292B', edge: '#77777A', highlight: '#D3D3D4', shadow: '#101011' },
  { id: 'white', name: 'White', body: '#E4E1DC', edge: '#FFFFFF', highlight: '#FFFFFF', shadow: '#88847F' },
  { id: 'pink', name: 'Pink', body: '#E6B7C2', edge: '#FFE2E8', highlight: '#FFF5F7', shadow: '#906C74' },
  { id: 'teal', name: 'Teal', body: '#8AC6C4', edge: '#D4F2F0', highlight: '#F1FFFF', shadow: '#4C7775' },
  { id: 'ultramarine', name: 'Ultramarine', body: '#626BD8', edge: '#A9AEFF', highlight: '#E1E3FF', shadow: '#343A87' },
];

const pixelFinishes: DeviceFinish[] = [
  { id: 'obsidian', name: 'Obsidian', body: '#303033', edge: '#77777C', highlight: '#D2D2D5', shadow: '#101012' },
  { id: 'porcelain', name: 'Porcelain', body: '#DDD9D0', edge: '#FAF8F2', highlight: '#FFFFFF', shadow: '#77746D' },
  { id: 'hazel', name: 'Hazel', body: '#8B8D7A', edge: '#C7C9B2', highlight: '#F1F2DF', shadow: '#4D5041' },
  { id: 'rose', name: 'Rose', body: '#D7B7AF', edge: '#F3DDD6', highlight: '#FFF5F0', shadow: '#795F59' },
];

const galaxyFinishes: DeviceFinish[] = [
  { id: 'titanium-gray', name: 'Titanium Gray', body: '#777875', edge: '#C9CAC5', highlight: '#F5F5EF', shadow: '#3F403D' },
  { id: 'titanium-black', name: 'Titanium Black', body: '#333435', edge: '#85878A', highlight: '#DBDDE0', shadow: '#111213' },
  { id: 'titanium-violet', name: 'Titanium Violet', body: '#827987', edge: '#C7BDCC', highlight: '#F3EAF6', shadow: '#48434C' },
  { id: 'titanium-yellow', name: 'Titanium Yellow', body: '#D5C7A2', edge: '#F6EBD0', highlight: '#FFF9E8', shadow: '#73694F' },
];

export const DEVICE_MODELS: DeviceModel[] = [
  phone(
    'iphone-16-pro-max', 'iPhone 16 Pro Max', 'iphone', 77.6 / 163,
    { left: .041, top: .018, width: .918, height: .964, radius: .105 }, .145,
    'dynamic-island', titanium, 1320 / 2868,
  ),
  phone(
    'iphone-16-pro', 'iPhone 16 Pro', 'iphone', 71.5 / 149.6,
    { left: .041, top: .018, width: .918, height: .964, radius: .105 }, .15,
    'dynamic-island', titanium, 1206 / 2622,
  ),
  phone(
    'iphone-16', 'iPhone 16', 'iphone', 71.6 / 147.6,
    { left: .042, top: .018, width: .916, height: .964, radius: .105 }, .15,
    'dynamic-island', iphone16Finishes, 1179 / 2556,
  ),
  phone(
    'iphone-15', 'iPhone 15', 'iphone', 71.6 / 147.6,
    { left: .043, top: .02, width: .914, height: .96, radius: .104 }, .15,
    'dynamic-island', titanium.slice(0, 2), 1179 / 2556,
  ),
  phone(
    'iphone-se', 'iPhone SE', 'iphone', 67.3 / 138.4,
    { left: .065, top: .09, width: .87, height: .80, radius: .04 }, .115,
    'home-button', aluminum, 750 / 1334,
  ),
  phone(
    'pixel-9-pro', 'Pixel 9 Pro', 'android-phone', 72 / 152.8,
    { left: .04, top: .018, width: .92, height: .964, radius: .095 }, .14,
    'punch-hole', pixelFinishes, 1280 / 2856,
    [
      { side: 'right', offset: .17, length: .12 },
      { side: 'right', offset: .30, length: .07 },
    ],
  ),
  phone(
    'galaxy-s24-ultra', 'Samsung Galaxy S24 Ultra', 'android-phone', 79 / 162.3,
    { left: .035, top: .015, width: .93, height: .97, radius: .073 }, .105,
    'punch-hole', galaxyFinishes, 1440 / 3120,
    [
      { side: 'right', offset: .18, length: .09 },
      { side: 'right', offset: .28, length: .06 },
    ],
  ),
  tablet(
    'ipad-pro-13', 'iPad Pro 13″ (M4)', 'ipad', 281.6 / 215.5,
    { left: .045, top: .045, width: .91, height: .91, radius: .036 }, 'none', 2064 / 2752,
  ),
  tablet(
    'ipad-air-11', 'iPad Air 11″', 'ipad', 247.6 / 178.5,
    { left: .045, top: .045, width: .91, height: .91, radius: .042 }, 'none', 1640 / 2360,
  ),
  tablet(
    'galaxy-tab-s9', 'Galaxy Tab S9', 'android-tablet', 254.3 / 165.8,
    { left: .045, top: .045, width: .91, height: .91, radius: .035 }, 'punch-hole', 1600 / 2560,
  ),
  {
    // Box = base width × (lid + base) height. Lid is 92.6% of the base width; see LaptopFrame.
    id: 'macbook-pro-14', name: 'MacBook Pro 14″', family: 'mac', kind: 'laptop', aspect: 1.487,
    screen: { left: .0555, top: .0413, width: .889, height: .8584, radius: .006 },
    bodyRadius: .026, cutout: 'notch', finishes: aluminum, buttons: [], screenAspect: 3024 / 1964,
  },
  {
    id: 'browser', name: 'Browser', family: 'web', kind: 'browser', aspect: 1.6,
    screen: { left: .008, top: .105, width: .984, height: .88, radius: .018 },
    bodyRadius: .035, cutout: 'none', finishes: aluminum, buttons: [], screenAspect: 1440 / 900,
  },
];

export function getDeviceModel(id: string): DeviceModel | undefined {
  return DEVICE_MODELS.find((model) => model.id === id);
}

export function defaultModelFor(family: DeviceFamily): DeviceModel {
  const defaults: Record<DeviceFamily, string> = {
    iphone: 'iphone-16-pro-max',
    ipad: 'ipad-pro-13',
    'android-phone': 'pixel-9-pro',
    'android-tablet': 'galaxy-tab-s9',
    mac: 'macbook-pro-14',
    web: 'browser',
  };
  return getDeviceModel(defaults[family]) as DeviceModel;
}

export function resolveDeviceModel(model: 'auto' | string, family: DeviceFamily): DeviceModel {
  return model === 'auto' ? defaultModelFor(family) : (getDeviceModel(model) ?? defaultModelFor(family));
}

const FLAT_BEZELS: Record<string, { phone: number; tablet: number }> = {
  minimal: { phone: .026, tablet: .018 }, glass: { phone: .034, tablet: .024 }, outline: { phone: .03, tablet: .03 }, none: { phone: 0, tablet: 0 },
};

const framed = new WeakMap<DeviceModel, Map<string, DeviceModel>>();

/**
 * The model with the element's bezel and corner tweaks applied. A thicker bezel widens the frame rather than shrinking
 * the screen, so screenshots keep their exact aspect. Results are cached so memoised frames keep a stable model.
 */
export function frameModel(model: DeviceModel, element: Pick<DeviceElement, 'style' | 'bezel' | 'corner'>): DeviceModel {
  const key = `${element.style}|${element.bezel ?? 1}|${element.corner ?? 1}`;
  let cache = framed.get(model);
  if (!cache) framed.set(model, cache = new Map());
  let result = cache.get(key);
  if (!result) cache.set(key, result = computeFrameModel(model, element));
  return result;
}

function computeFrameModel(model: DeviceModel, element: Pick<DeviceElement, 'style' | 'bezel' | 'corner'>): DeviceModel {
  const corner = element.corner ?? 1;
  const variableBezel = (model.kind === 'phone' || model.kind === 'tablet') && model.cutout !== 'home-button';
  const baseBezel = variableBezel
    ? element.style === 'real' || element.style === 'matte' || element.style === 'clay'
      ? model.screen.left
      : FLAT_BEZELS[element.style]?.[model.kind === 'phone' ? 'phone' : 'tablet']
      : undefined;
  const bezel = baseBezel === undefined ? undefined : baseBezel * (element.bezel ?? 1);
  if (corner === 1 && (bezel === undefined || bezel === model.screen.left)) return model;
  const bodyRadius = model.bodyRadius * corner;
  if (bezel === undefined) return { ...model, bodyRadius, screen: { ...model.screen, radius: model.screen.radius * corner } };
  const aspect = model.screenAspect / (1 - 2 * bezel * (1 - model.screenAspect));
  return {
    ...model, aspect, bodyRadius,
    screen: { left: bezel, width: 1 - 2 * bezel, top: bezel * aspect, height: 1 - 2 * bezel * aspect, radius: Math.max(.012, bodyRadius - bezel) },
  };
}
