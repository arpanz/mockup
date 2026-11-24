import dynamicIconImports from 'lucide-react/dist/esm/dynamicIconImports.js';
import { createImage, createShape, createText, makeId } from '../model/defaults';
import type { Asset, DeviceElement, Project, Shadow, Slide, StudioElement, TextElement } from '../model/types';
import { elementBox } from '../render/geometry';
import { getFont } from '../text/fontCatalog';
import { baseUnit } from '../model/units';
import { buildFromSpec, type SizedBuildInput, type SizedImage } from './buildFromSpec';
import type { FlowOptions, FlowSticker } from './spec';

type SizedScreen = SizedBuildInput['screens'][number];
export type SizedFlowInput = Omit<SizedBuildInput, 'screens'> & {
  flow?: FlowOptions;
  screens: Array<Omit<SizedScreen, 'logo' | 'sticker'> & { logo?: SizedImage; sticker?: Omit<FlowSticker, 'image'> & { image: SizedImage } }>;
};

interface Palette { page: string; wave: string; deep: string; band: string; accent: string; ink: string; tile: string }

/** Mixes two #RRGGBB colors; amount 0 is `a`, 1 is `b`. */
function mix(a: string, b: string, amount: number) {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2].map((i) => Math.round(channel(a, i) * (1 - amount) + channel(b, i) * amount).toString(16).padStart(2, '0')).join('')}`;
}

/** Relative luminance of a #RRGGBB color, 0..1. */
function luminance(hex: string) {
  const [r, g, b] = [0, 1, 2].map((i) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function paletteFor(options: FlowOptions, brandColor?: string): Palette {
  const night = options.theme === 'night';
  const page = options.colors?.page ?? (night ? '#0F1714' : '#F5F6F2');
  const wave = options.colors?.wave ?? brandColor ?? '#0B7D45';
  return {
    page,
    wave,
    deep: options.colors?.deep ?? mix(wave, '#000000', 0.25),
    band: options.colors?.band ?? mix(wave, page, night ? 0.85 : 0.82),
    accent: options.colors?.accent ?? mix(wave, '#FFFFFF', 0.6),
    ink: options.colors?.ink ?? '#0B1210',
    tile: night ? mix(page, '#FFFFFF', 0.07) : '#FFFFFF',
  };
}

const softShadow = (y: number, blur: number, opacity: number, color = '#0B1210'): Shadow => ({ enabled: true, x: 0, y, blur, spread: 0, color, opacity });

/** Path through the points with flat tangents, so the curve swells between them. */
function wave(points: Array<[number, number]>) {
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const mid = (x0 + x1) / 2;
    d += ` C${mid},${y0} ${mid},${y1} ${x1},${y1}`;
  }
  return d;
}

/** The whole set's background at one output size: wave, band, depth, motifs and the dashed trail. */
function backgroundSvg(W: number, H: number, count: number, options: FlowOptions, palette: Palette) {
  const total = W * count;
  const bookends = options.bookends !== false;
  const motifs = options.motifs ?? ['grid'];
  // Top edge of the wave: a point at every slide edge and a dip in the middle of each slide.
  const top: Array<[number, number]> = [[-40, H * 0.6]];
  for (let i = 0; i < count; i++) {
    if (i > 0) top.push([i * W, H * (i === 1 ? 0.6 : 0.575 + (i % 2 ? 0.02 : -0.02))]);
    top.push([(i + 0.5) * W, H * (0.66 + (i % 2 ? 0.015 : -0.015))]);
  }
  top.push([total + 40, H * 0.59]);
  const band = top.map(([x, y]): [number, number] => [x, y - H * 0.078]);
  const depth: Array<[number, number]> = [[-40, H * 0.62]];
  for (let x = W * 0.6, i = 0; x < total; x += W * 0.65, i++) depth.push([x, H * (0.82 + (i % 2 ? -0.04 : 0.04))]);
  depth.push([total + 40, H * 0.62]);
  const trail = depth.map(([x, y]): [number, number] => [x, y - H * 0.036]);
  const under = ` L${total + 40},${H + 40} L-40,${H + 40} Z`;
  const ends = bookends ? `<path d="M-40,-40 H${W} V${H + 40} H-40 Z M${W * (count - 1)},-40 H${total + 40} V${H + 40} H${W * (count - 1)} Z"/>` : '';

  let grid = '';
  if (motifs.includes('grid')) {
    for (let x = 0; x <= total; x += 120) grid += `<path d="M${x},0 V${H}"/>`;
    for (let y = 0; y <= H; y += 120) grid += `<path d="M0,${y} H${total}"/>`;
  }
  let corners = '';
  if (motifs.includes('corners')) {
    let seed = 4;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < 3; j++) {
        const x = i * W + 60 + random() * (W - 160);
        const y = H * (0.76 + random() * 0.18);
        const b = 46 + random() * 34;
        corners += `<g transform="translate(${x.toFixed(0)},${y.toFixed(0)})" fill="none" stroke="${palette.accent}" stroke-width="7" stroke-linecap="round" opacity=".35">`
          + `<path d="M0,${b * 0.35} V0 H${b * 0.35} M${b * 0.65},0 H${b} V${b * 0.35} M${b},${b * 0.65} V${b} H${b * 0.65} M${b * 0.35},${b} H0 V${b * 0.65}"/></g>`;
      }
    }
  }
  // BackgroundLayer scales image backgrounds by 1.06; drawing at 1/1.06 keeps the seams where they're drawn.
  const counterScale = `translate(${total / 2},${H / 2}) scale(${(1 / 1.06).toFixed(6)}) translate(${-total / 2},${-H / 2})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${H}" viewBox="0 0 ${total} ${H}">`
    + `<defs><clipPath id="wave"><path d="${wave(top)}${under}"/>${ends}</clipPath>`
    + `<linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${palette.wave}"/><stop offset="1" stop-color="${palette.deep}"/></linearGradient></defs>`
    + `<g transform="${counterScale}">`
    + `<rect x="-400" y="-200" width="${total + 800}" height="${H + 400}" fill="${palette.page}"/>`
    + `<path d="${wave(band)}${under}" fill="${palette.band}"/>`
    + `<rect x="-400" y="-200" width="${total + 800}" height="${H + 400}" fill="url(#fill)" clip-path="url(#wave)"/>`
    + `<path d="${wave(depth)}${under}" fill="${mix(palette.deep, '#000000', 0.3)}" fill-opacity=".45"/>`
    + (grid ? `<g clip-path="url(#wave)" stroke="#FFFFFF" stroke-opacity=".055" stroke-width="2">${grid}</g>` : '')
    + (corners ? `<g clip-path="url(#wave)">${corners}</g>` : '')
    + `<path d="${wave(trail)}" fill="none" stroke="${palette.accent}" stroke-width="8" stroke-dasharray="4 26" stroke-linecap="round"/>`
    + '</g></svg>';
}

const svgData = (svg: string) => `data:image/svg+xml;base64,${btoa(svg)}`;

/** A Lucide icon as an SVG data URL, or null for an unknown name. */
async function lucideIcon(name: string, color: string) {
  const load = (dynamicIconImports as Record<string, () => Promise<{ __iconNode?: Array<[string, Record<string, string>]> }>>)[name];
  if (!load) return null;
  const nodes = (await load()).__iconNode;
  if (!nodes) return null;
  const body = nodes.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).filter(([key]) => key !== 'key').map(([key, value]) => `${key}="${value}"`).join(' ')}/>`).join('');
  return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`);
}

/** Part of a screenshot as a PNG data URL; crop is [x, y, width, height] in the image's own pixels. */
async function crop(image: SizedImage, [x, y, w, h]: [number, number, number, number]): Promise<SizedImage> {
  const element = new Image();
  element.src = image.src;
  await element.decode();
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  canvas.getContext('2d')!.drawImage(element, x, y, w, h, 0, 0, canvas.width, canvas.height);
  return { name: `${image.name} call-out`, src: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
}

/**
 * A custom set: one wave across every slide, the screenshots in the house device frame, and the spec's call-outs,
 * icon tiles, icons, logos and stickers. Elements are sized in units so every output shares them; only the
 * background is drawn per output, because one panorama image can't fit store sizes with different aspect ratios.
 */
export async function buildFlow(input: SizedFlowInput): Promise<{ projects: Record<string, Project>; warnings: string[] }> {
  const options = input.flow ?? {};
  const palette = paletteFor(options, input.brandColor);
  const night = options.theme === 'night';
  const bookends = options.bookends !== false;
  // clean-center supplies the house device and title styles, and the per-size screenshot overrides.
  const base = buildFromSpec({ ...input, templateId: 'clean-center', subtitles: false });
  const warnings = [...base.warnings];
  const title0 = base.project.slides[0].elements.find((element): element is TextElement => element.type === 'text' && element.role === 'title')!;
  const type = options.type ?? {};
  if (type.font && !getFont(type.font)) warnings.push(`flow.type.font "${type.font}" isn't in the font catalog, so the house font is used.`);
  const titleType: Partial<TextElement> = {
    ...(type.font && getFont(type.font) ? { fontFamily: type.font } : {}),
    ...(type.weight !== undefined ? { fontWeight: type.weight } : {}),
    ...(type.tracking !== undefined ? { letterSpacing: type.tracking } : {}),
    ...(type.lineHeight !== undefined ? { lineHeight: type.lineHeight } : {}),
  };
  const snug = options.layout === 'snug';
  const lifted = options.callouts === 'lifted';

  const assets: Record<string, Asset> = { ...base.project.assets };
  const bySrc = new Map(Object.values(assets).map((asset) => [asset.src, asset.id]));
  const assetFor = (image: SizedImage) => {
    let id = bySrc.get(image.src);
    if (!id) {
      id = makeId();
      assets[id] = { id, name: image.name, src: image.src, width: image.width, height: image.height };
      bySrc.set(image.src, id);
    }
    return id;
  };
  const iconElement = async (slide: number, name: string, color: string, x: number, y: number, size: number) => {
    const src = await lucideIcon(name, color);
    if (!src) {
      warnings.push(`Slide ${slide + 1}: "${name}" isn't a Lucide icon name (kebab-case, e.g. "shopping-cart"), so it's left out.`);
      return null;
    }
    return createImage(assetFor({ name: `${name}.svg`, src, width: 96, height: 96 }), size, size, { name: 'Icon', x, y, fit: 'contain' });
  };

  const last = input.screens.length - 1;
  const slides: Slide[] = [];
  const waveIsDark = luminance(palette.deep) < 0.18; // where white and black text read equally well
  const phone2Ids = new Map<number, string>();
  for (const [index, screen] of input.screens.entries()) {
    const built = base.project.slides[index];
    const solid = bookends && (index === 0 || index === last);
    // Flipped: the phone hangs from the top edge and the headline sits under it, on the wave. Bookends never flip.
    const flip = Boolean(screen.flip) && !solid;
    if (screen.flip && solid) warnings.push(`Slide ${index + 1}: bookend slides don't flip, so "flip" is ignored there.`);
    if (flip && screen.tiles?.length) warnings.push(`Slide ${index + 1}: a flipped slide has no room for tiles, so they're left out.`);
    // A flipped headline sits on the wave's deep colour: light type when that is dark.
    const lightType = solid || night || (flip && waveIsDark);
    const tiles = flip ? [] : screen.tiles ?? [];
    const elements: StudioElement[] = [];

    const logoAbove = Boolean(screen.logo && solid);
    if (screen.logo && logoAbove) {
      elements.push(createImage(assetFor(screen.logo), 144, 144, { name: 'Logo', y: 0.062, fit: 'contain', radius: 34, shadow: softShadow(14, 30, 0.3, '#000000') }));
    }
    elements.push({
      ...title0,
      id: makeId(),
      visible: Boolean(screen.title.trim()),
      text: screen.title,
      y: flip ? 0.865 : logoAbove ? 0.165 : solid ? 0.11 : 0.105,
      ...titleType,
      fontSize: type.size ?? (logoAbove ? 118 : 112),
      fill: { kind: 'solid', color: lightType ? '#FFFFFF' : palette.ink },
      accent: { ...title0.accent, style: type.accent ?? 'color', color: lightType ? palette.accent : palette.wave },
    });
    if (screen.icon) {
      const icon = await iconElement(index, screen.icon, lightType ? palette.accent : palette.wave, 0.5, flip ? 0.765 : 0.215, 95);
      if (icon) elements.push(icon);
    }
    for (const [i, tile] of tiles.entries()) {
      const x = 0.5 + (i - (tiles.length - 1) / 2) * 0.23;
      elements.push(createShape('rect', { name: 'Tile', x, y: 0.262, w: 241, h: 221, radius: 38, fill: { kind: 'solid', color: palette.tile }, shadow: softShadow(12, 30, 0.1) }));
      const icon = await iconElement(index, tile.icon, night ? palette.accent : palette.wave, x, 0.245, 84);
      if (icon) elements.push(icon);
      elements.push(createText('caption', { text: tile.label, x, y: 0.292, w: 0.22, fontSize: 33, maxLines: 1, fill: { kind: 'solid', color: night ? '#FFFFFF' : palette.ink } }));
    }
    // The template's device keeps its id, so the per-size screenshot overrides still apply; only its place changes.
    const device = built.elements.find((element): element is DeviceElement => element.type === 'device')!;
    if (screen.phone2) {
      const other = input.screens[screen.phone2.screen];
      if (!other) warnings.push(`Slide ${index + 1}: phone2.screen ${screen.phone2.screen} isn't a screen of this set, so the second phone is left out.`);
      else {
        const { x = 0.7, y = 0.6, height = 0.66, rotation = 6 } = screen.phone2;
        const id = makeId();
        phone2Ids.set(index, id);
        elements.push({ ...device, ...options.device, id, name: 'Second phone', x, y, h: height, rotation, screen: { ...device.screen, assetId: assetFor(other.image) } });
      }
    }
    elements.push({
      ...device,
      ...options.device,
      x: screen.phone?.x ?? 0.5,
      y: screen.phone?.y ?? (flip ? 0.33 : solid ? 0.69 : tiles.length ? 0.715 : 0.645),
      h: screen.phone?.height ?? (solid ? 0.74 : tiles.length ? 0.7 : 0.79),
      rotation: screen.phone?.rotation ?? (options.tilt && solid ? (index === 0 ? -3 : 3) : 0),
    });
    if (screen.callout) {
      const image = await crop(screen.image, screen.callout.crop);
      const w = (screen.callout.width ?? (lifted ? 0.96 : 1.06)) * 1000;
      elements.push(createImage(assetFor(image), w, w * image.height / image.width, {
        name: 'Call-out',
        x: screen.callout.x ?? 0.5,
        y: screen.callout.y ?? 0.5,
        fit: 'contain',
        radius: lifted ? 40 : 34,
        rotation: screen.callout.rotation ?? (options.tilt ? (index % 2 ? 2 : -2) : 0),
        shadow: lifted ? softShadow(46, 110, 0.42, mix(palette.deep, '#000000', 0.55)) : softShadow(34, 79, 0.28),
        stroke: lifted ? { enabled: true, width: 2, color: '#0B1210', opacity: 0.08 } : { enabled: true, width: 8, color: '#FFFFFF', opacity: 1 },
      }));
    }
    if (screen.sticker) {
      const { image, x = 0.5, y = 0.5, width = 0.4, rotation = 0, shadow = true } = screen.sticker;
      const w = width * 1000;
      elements.push(createImage(assetFor(image), w, w * image.height / image.width, { name: 'Sticker', x, y, rotation, fit: 'contain', radius: 30, ...(shadow ? { shadow: softShadow(24, 60, 0.22) } : {}) }));
    }
    // Only screenshot swaps carry over from the template's overrides; its per-size layout tweaks would fight ours.
    const overrides: Slide['overrides'] = {};
    for (const [outputId, patches] of Object.entries(built.overrides)) {
      const screenPatch = (patches[device.id] as Partial<DeviceElement> | undefined)?.screen;
      if (screenPatch) overrides[outputId] = { ...overrides[outputId], [device.id]: { screen: screenPatch } };
    }
    // The second phone swaps to the other screen's per-size screenshot too.
    const phone2Id = phone2Ids.get(index);
    if (phone2Id && screen.phone2) {
      const other = input.screens[screen.phone2.screen];
      for (const output of base.project.outputs) {
        const image = other.images[output.id];
        if (image) overrides[output.id] = { ...overrides[output.id], [phone2Id]: { screen: { ...device.screen, assetId: assetFor(image) } } };
      }
    }
    slides.push({ ...built, background: { kind: 'solid', color: palette.page, noise: 0 }, elements, overrides });
  }

  if (snug) {
    // Stack from the top: logo, headline, icon or tiles, then the phone right under them, running off the bottom.
    // Positions depend on the canvas shape, so the first output sets the elements and the rest get overrides.
    for (const [index, slide] of slides.entries()) {
      const screen = input.screens[index];
      // A flipped slide stacks from the bottom instead: headline, icon, then the phone running off the top.
      const flipped = Boolean(screen.flip) && !(bookends && (index === 0 || index === last));
      for (const [o, output] of base.project.outputs.entries()) {
        const W = output.width;
        const H = output.height;
        const u = baseUnit(W, H);
        const place: Record<string, Partial<StudioElement>> = {};
        const device = slide.elements.find((element): element is DeviceElement => element.type === 'device' && element.name !== 'Second phone')!;
        const aspect = elementBox({ ...device, h: 1 }, output).width / H;
        const phoneHeight = (options.phoneWidth ?? 0.8) * W / aspect;
        if (flipped) {
          let bottom = H * (1 - 0.058);
          const title = slide.elements.find((element): element is TextElement => element.type === 'text' && element.role === 'title');
          if (title?.visible) {
            const height = elementBox(title, output).height;
            place[title.id] = { y: (bottom - height / 2) / H };
            bottom -= height;
          }
          const icon = slide.elements.find((element) => element.name === 'Icon');
          if (icon && icon.type === 'image') {
            bottom -= 40 * u;
            place[icon.id] = { y: (bottom - icon.h * u / 2) / H };
            bottom -= icon.h * u;
          }
          bottom -= 64 * u;
          const h = screen.phone?.height !== undefined ? screen.phone.height * H : phoneHeight;
          place[device.id] = { y: screen.phone?.y ?? (bottom - h / 2) / H, h: h / H, rotation: screen.phone?.rotation ?? 0 };
        } else {
          let cursor = H * 0.058;
          const logo = slide.elements.find((element) => element.name === 'Logo');
          if (logo && logo.type === 'image') {
            place[logo.id] = { y: (cursor + logo.h * u / 2) / H };
            cursor += logo.h * u + 44 * u;
          }
          const title = slide.elements.find((element): element is TextElement => element.type === 'text' && element.role === 'title');
          if (title?.visible) {
            const height = elementBox(title, output).height;
            place[title.id] = { y: (cursor + height / 2) / H };
            cursor += height;
          }
          const icon = slide.elements.find((element) => element.name === 'Icon' && !screen.tiles?.length);
          if (icon && icon.type === 'image') {
            cursor += 40 * u;
            place[icon.id] = { y: (cursor + icon.h * u / 2) / H };
            cursor += icon.h * u;
          }
          if (screen.tiles?.length) {
            cursor += 48 * u;
            const tileH = 221 * u;
            for (const element of slide.elements) {
              if (element.name === 'Tile') place[element.id] = { y: (cursor + tileH / 2) / H };
              if (element.name === 'Icon') place[element.id] = { y: (cursor + tileH * 0.42) / H };
              if (element.type === 'text' && element.role === 'caption') place[element.id] = { y: (cursor + tileH * 0.78) / H };
            }
            cursor += tileH;
          }
          cursor += 64 * u;
          // The spec's own phone fields win; the rest come from the stack.
          const h = screen.phone?.height !== undefined ? screen.phone.height * H : phoneHeight;
          place[device.id] = { y: screen.phone?.y ?? (cursor + h / 2) / H, h: h / H, rotation: screen.phone?.rotation ?? 0 };
        }
        for (const [id, patch] of Object.entries(place)) {
          if (o === 0) {
            const at = slide.elements.findIndex((element) => element.id === id);
            slide.elements[at] = { ...slide.elements[at], ...patch } as StudioElement;
          } else {
            slide.overrides[output.id] = { ...slide.overrides[output.id], [id]: { ...slide.overrides[output.id]?.[id], ...patch } };
          }
        }
      }
    }
  }

  const projects: Record<string, Project> = {};
  for (const output of base.project.outputs) {
    const backgroundId = makeId();
    const src = svgData(backgroundSvg(output.width, output.height, slides.length, options, palette));
    projects[output.id] = {
      ...base.project,
      outputs: [output],
      slides,
      assets: { ...assets, [backgroundId]: { id: backgroundId, name: 'Flow background', src, width: output.width * slides.length, height: output.height } },
      span: { enabled: true, background: { kind: 'image', assetId: backgroundId, fit: 'cover', blur: 0, overlay: '#00000000', noise: 0 } },
    };
  }
  return { projects, warnings };
}
