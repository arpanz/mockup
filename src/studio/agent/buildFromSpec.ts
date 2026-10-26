import { resolveDeviceModel } from '../devices/catalog';
import { createProject, makeId } from '../model/defaults';
import { OUTPUT_CATALOG } from '../model/outputs';
import type { Asset, DeviceElement, Project, StudioElement, TextElement } from '../model/types';
import { TEMPLATES } from '../templates/catalog';
import type { AgentBuildInput, AgentImage } from './spec';
import { describeTemplate } from './templateInfo';

export type SizedImage = AgentImage & { width: number; height: number };
export type SizedBuildInput = Omit<AgentBuildInput, 'screens'> & {
  screens: Array<Omit<AgentBuildInput['screens'][number], 'image' | 'images'> & { image: SizedImage; images: Record<string, SizedImage> }>;
};

const baseName = (file: string) => file.replace(/\.[^.]+$/, '');
const isText = (role: TextElement['role']) => (element: StudioElement): element is TextElement => element.type === 'text' && element.role === role;
const ratio = (image: SizedImage) => `${image.width}×${image.height}`;

/**
 * A finished project from a spec: the template laid out over the screenshots, the copy in place, every requested store
 * size, and per-size screenshots as overrides. Pure, so it runs anywhere; the page adds the brand color.
 */
export function buildFromSpec(input: SizedBuildInput): { project: Project; warnings: string[] } {
  const template = TEMPLATES.find((item) => item.id === input.templateId);
  if (!template) throw new Error(`Unknown template "${input.templateId}".`);
  const info = describeTemplate(template);
  const warnings: string[] = [];

  // One asset per distinct file, so a screenshot reused across slides (or as the second phone) is stored once.
  const assets = new Map<string, Asset>();
  const assetFor = (image: SizedImage) => {
    let asset = assets.get(image.src);
    if (!asset) {
      asset = { id: makeId(), name: image.name, src: image.src, width: image.width, height: image.height };
      assets.set(image.src, asset);
    }
    return asset.id;
  };
  const screenIds = input.screens.map((screen) => assetFor(screen.image));
  const designed = template.build(screenIds, input.screens.map(({ title, subtitle }) => ({ title, subtitle })));

  const project = createProject();
  project.name = input.name;
  project.outputs = input.sizeIds.map((id) => {
    const output = OUTPUT_CATALOG.find((item) => item.id === id);
    if (!output) throw new Error(`Unknown size "${id}".`);
    return { ...output };
  });
  project.span = designed.span;
  project.slides = designed.slides.map((slide, index) => {
    const screen = input.screens[index];
    const title = slide.elements.find(isText('title'));
    const subtitle = slide.elements.find(isText('subtitle'));
    const label = `Slide ${index + 1} (${screen.image.name})`;
    // A slide the template keeps text-free (a phone close-up) stays that way, subtitle included.
    const textless = Boolean(title && !title.visible);
    if (title && !screen.title.trim()) title.visible = false;
    if (subtitle) {
      if (textless || !screen.subtitle.trim() || input.subtitles === false) subtitle.visible = false;
      else if (input.subtitles === true) subtitle.visible = true;
    }
    if (textless && screen.title.trim()) warnings.push(`${label}: "${template.name}" shows this slide as a phone close-up with no text, so its headline is hidden.`);
    return { ...slide, name: baseName(screen.image.name) || slide.name };
  });
  if (!info.subtitles && input.subtitles === undefined && input.screens.some((screen) => screen.subtitle.trim())) {
    warnings.push(`"${template.name}" is headline-only, so subtitles are hidden. Set "subtitles": true to show them, or pick a template with subtitles.`);
  }

  // Per-size screenshots: every phone showing a screenshot shows its alternative on that size, the second phone included.
  const alternatives = new Map<string, Record<string, string>>();
  input.screens.forEach((screen, index) => {
    for (const [sizeId, image] of Object.entries(screen.images)) {
      if (!input.sizeIds.includes(sizeId)) {
        warnings.push(`Slide ${index + 1}: images["${sizeId}"] is ignored because "${sizeId}" isn't in sizes.`);
        continue;
      }
      alternatives.set(screenIds[index], { ...alternatives.get(screenIds[index]), [sizeId]: assetFor(image) });
    }
  });
  for (const slide of project.slides) {
    for (const element of slide.elements) {
      if (element.type !== 'device' || !element.screen.assetId) continue;
      for (const [sizeId, assetId] of Object.entries(alternatives.get(element.screen.assetId) ?? {})) {
        (slide.overrides[sizeId] ??= {})[element.id] = { screen: { ...element.screen, assetId } } as Partial<DeviceElement>;
      }
    }
  }
  project.assets = Object.fromEntries([...assets.values(), ...designed.assets].map((asset) => [asset.id, asset]));

  for (const output of project.outputs) warnings.push(...fitWarnings(input, output, project));
  const blurry = [...assets.values()].filter((asset) => Math.min(asset.width, asset.height) < 600);
  if (blurry.length) {
    warnings.push(`${blurry.map((asset) => `${asset.name} (${asset.width}×${asset.height})`).join(', ')} ${blurry.length > 1 ? 'are' : 'is'} low resolution and will look soft. Capture at the device's full resolution.`);
  }
  return { project, warnings };
}

/** Screenshots that won't fill this size's frame cleanly: a phone shot in a tablet, or the wrong shape. */
function fitWarnings(input: SizedBuildInput, output: Project['outputs'][number], project: Project): string[] {
  const device = project.slides[0]?.elements.find((element): element is DeviceElement => element.type === 'device');
  if (!device) return [];
  const model = resolveDeviceModel(device.model, output.family);
  const images = [...new Map(input.screens.map((screen) => screen.images[output.id] ?? screen.image).map((image) => [image.src, image])).values()];
  if ((model.kind === 'tablet' || model.kind === 'laptop') && images.every((image) => image.width / image.height < 0.6)) {
    return [`${output.id} (${output.label}) uses the ${model.name} frame, but its screenshots are phone-shaped, so they'll be heavily cropped. Add "images": { "${output.id}": "…" } with ${model.kind === 'tablet' ? 'tablet' : 'desktop'} screenshots.`];
  }
  const wrongShape = images.filter((image) => Math.abs(image.width / image.height - model.screenAspect) / model.screenAspect > 0.12);
  if (!wrongShape.length) return [];
  return [`${output.id}: ${wrongShape.map((image) => `${image.name} (${ratio(image)})`).join(', ')} ${wrongShape.length > 1 ? "don't" : "doesn't"} match the ${model.name} screen shape, so the bottom is cropped or the sides are filled. Capture on a device with that shape.`];
}
