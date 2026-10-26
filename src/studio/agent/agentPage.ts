import { produce } from 'immer';
import { createRenderSession, type RenderSession } from '../export/renderSlide';
import { applyBrandColor, measureImageBackdrops } from '../model/brandColors';
import type { Project } from '../model/types';
import { buildFromSpec, type SizedImage } from './buildFromSpec';
import { buildFlow } from './buildFlow';
import type { AgentImage, FrameflowAgent } from './spec';

/**
 * The page `npm run mockups` drives at `/#agent`: no editor, no autosave, just build-from-spec and the same renderer
 * the Export panel uses, so agent output matches the studio pixel for pixel.
 */
let project: Project | null = null;
let projects: Record<string, Project> | null = null;
let session: RenderSession | null = null;

async function measure(image: AgentImage): Promise<SizedImage> {
  const element = new Image();
  element.src = image.src;
  try {
    await element.decode();
  } catch {
    throw new Error(`${image.name} couldn't be read as an image.`);
  }
  return { ...image, width: element.naturalWidth, height: element.naturalHeight };
}

const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).slice(String(reader.result).indexOf(',') + 1));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

const agent: FrameflowAgent = {
  async build(input) {
    // Each distinct file is decoded once, however many slides or sizes use it.
    const sized = new Map<string, Promise<SizedImage>>();
    const sizeOf = (image: AgentImage) => {
      if (!sized.has(image.src)) sized.set(image.src, measure(image));
      return sized.get(image.src)!;
    };
    const screens = await Promise.all(input.screens.map(async ({ logo, sticker, ...screen }) => ({
      ...screen,
      image: await sizeOf(screen.image),
      images: Object.fromEntries(await Promise.all(Object.entries(screen.images).map(async ([id, image]) => [id, await sizeOf(image)] as const))),
      logo: logo && await sizeOf(logo),
      sticker: sticker && { ...sticker, image: await sizeOf(sticker.image) },
    })));
    session = createRenderSession();
    if (input.templateId === 'flow') {
      // One project per size: each carries its own panorama background (see buildFlow).
      const built = await buildFlow({ ...input, screens });
      projects = built.projects;
      project = projects[input.sizeIds[0]];
      return {
        slides: project.slides.map((slide) => ({ name: slide.name })),
        outputs: input.sizeIds.map((id) => projects![id].outputs[0]).map(({ id, label, width, height }) => ({ id, label, width, height })),
        warnings: built.warnings,
      };
    }
    projects = null;
    const built = buildFromSpec({ ...input, screens });
    let next = built.project;
    if (input.brandColor) {
      const backdrops = await measureImageBackdrops(next);
      next = produce(next, (draft) => applyBrandColor(draft, input.brandColor!, backdrops));
    }
    project = next;
    return {
      slides: next.slides.map((slide) => ({ name: slide.name })),
      outputs: next.outputs.map(({ id, label, width, height }) => ({ id, label, width, height })),
      warnings: built.warnings,
    };
  },

  async render(slideIndex, outputId, options) {
    const selected = projects?.[outputId] ?? project;
    if (!selected || !session) throw new Error('Call build() before render().');
    const slide = selected.slides[slideIndex];
    const output = selected.outputs.find((item) => item.id === outputId);
    if (!slide || !output) throw new Error(`No slide ${slideIndex + 1} on ${outputId}.`);
    const blob = await session.render({ project: selected, slide, output, slideIndex, options: { ...options, quality: 0.92 } });
    return blobToBase64(blob);
  },

  projectFile() {
    // A flow set saves its first size's project; the others differ only in background.
    if (!project) throw new Error('Call build() first.');
    return JSON.stringify({ ...project, updatedAt: Date.now() });
  },
};

(window as unknown as { frameflowAgent: FrameflowAgent }).frameflowAgent = agent;
