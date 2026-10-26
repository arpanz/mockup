import { produce } from 'immer';
import { createRenderSession, type RenderSession } from '../export/renderSlide';
import { applyBrandColor, measureImageBackdrops } from '../model/brandColors';
import type { Project } from '../model/types';
import { buildFromSpec, type SizedImage } from './buildFromSpec';
import type { AgentImage, FrameflowAgent } from './spec';

/**
 * The page `npm run mockups` drives at `/#agent`: no editor, no autosave, just build-from-spec and the same renderer
 * the Export panel uses, so agent output matches the studio pixel for pixel.
 */
let project: Project | null = null;
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
    const screens = await Promise.all(input.screens.map(async (screen) => ({
      ...screen,
      image: await sizeOf(screen.image),
      images: Object.fromEntries(await Promise.all(Object.entries(screen.images).map(async ([id, image]) => [id, await sizeOf(image)] as const))),
    })));
    const built = buildFromSpec({ ...input, screens });
    let next = built.project;
    if (input.brandColor) {
      const backdrops = await measureImageBackdrops(next);
      next = produce(next, (draft) => applyBrandColor(draft, input.brandColor!, backdrops));
    }
    project = next;
    session = createRenderSession();
    return {
      slides: next.slides.map((slide) => ({ name: slide.name })),
      outputs: next.outputs.map(({ id, label, width, height }) => ({ id, label, width, height })),
      warnings: built.warnings,
    };
  },

  async render(slideIndex, outputId, options) {
    if (!project || !session) throw new Error('Call build() before render().');
    const slide = project.slides[slideIndex];
    const output = project.outputs.find((item) => item.id === outputId);
    if (!slide || !output) throw new Error(`No slide ${slideIndex + 1} on ${outputId}.`);
    const blob = await session.render({ project, slide, output, slideIndex, options: { ...options, quality: 0.92 } });
    return blobToBase64(blob);
  },

  projectFile() {
    if (!project) throw new Error('Call build() first.');
    return JSON.stringify({ ...project, updatedAt: Date.now() });
  },
};

(window as unknown as { frameflowAgent: FrameflowAgent }).frameflowAgent = agent;
