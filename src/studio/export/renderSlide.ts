import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { toCanvas } from 'html-to-image';
import type { OutputSpec, Project, Slide, TextElement } from '../model/types';
import { SlideRenderer } from '../render/SlideRenderer';
import { loadFonts } from '../text/fontLoader';
import { buildFontEmbedCSS } from './fontEmbed';

export interface RenderOptions {
  format: 'png' | 'jpeg' | 'webp';
  quality: number;
  scale: number;
  transparent?: boolean;
}

interface RenderRequest {
  project: Project;
  slide: Slide;
  output: OutputSpec;
  slideIndex: number;
  options: RenderOptions;
}

const validScales = [0.5, 1, 2];

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function getHost(): { host: HTMLDivElement; root: Root } {
  let host = document.querySelector<HTMLDivElement>('[data-frameflow-export-host]');
  if (!host) {
    host = document.createElement('div');
    host.dataset.frameflowExportHost = 'true';
    Object.assign(host.style, {
      position: 'fixed', left: '-100000px', top: '0', contain: 'strict',
      overflow: 'hidden', pointerEvents: 'none',
    });
    document.body.append(host);
  }
  const existing = (host as HTMLDivElement & { __frameflowRoot?: Root }).__frameflowRoot;
  if (existing) return { host, root: existing };
  const root = createRoot(host);
  (host as HTMLDivElement & { __frameflowRoot?: Root }).__frameflowRoot = root;
  return { host, root };
}

function fontFamilies(slide: Slide): string[] {
  const texts = slide.elements.filter((element): element is TextElement => element.type === 'text');
  const families = new Set(texts.map((element) => element.fontFamily).filter(Boolean));
  if (texts.some((element) => element.accent.style === 'italic-serif')) families.add('Instrument Serif');
  return [...families];
}

async function waitForImages(node: HTMLElement): Promise<void> {
  await Promise.all([...node.querySelectorAll('img')].map(async (img) => {
    if (img.complete && img.naturalWidth > 0) return;
    try {
      if (typeof img.decode === 'function') await img.decode();
      else await new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      });
    } catch { /* Broken images should not prevent the rest of the slide from exporting. */ }
  }));
}

export interface RenderSession {
  render(request: RenderRequest): Promise<Blob>;
}

export function createRenderSession(): RenderSession {
  let fontCss: string | undefined;
  let busy = false;
  return {
    async render({ project, slide, output, slideIndex, options }) {
      if (busy) throw new Error('This export renderer is already processing a slide.');
      busy = true;
      try {
        if (!validScales.includes(options.scale)) throw new Error('Scale must be 0.5, 1, or 2.');
        if (!Number.isFinite(options.quality) || options.quality < 0 || options.quality > 1) {
          throw new Error('Quality must be between 0 and 1.');
        }
        const { host, root } = getHost();
        host.style.width = `${output.width}px`;
        host.style.height = `${output.height}px`;
        flushSync(() => root.render(createElement(SlideRenderer, {
          project, slide, output, slideIndex, interactive: false,
        })));
        await loadFonts(fontFamilies(slide));
        await document.fonts.ready;
        await waitForImages(host);
        await nextFrame();
        await nextFrame();
        const node = host.firstElementChild;
        if (!(node instanceof HTMLElement)) throw new Error('SlideRenderer did not render an export element.');
        // Fonts for the whole project, built once per session (an export renders one project).
        if (fontCss === undefined) {
          try { fontCss = await buildFontEmbedCSS(project); }
          catch { fontCss = ''; }
        }
        const canvas = await toCanvas(node, {
          width: output.width,
          height: output.height,
          pixelRatio: options.scale,
          cacheBust: false,
          fontEmbedCSS: fontCss,
          backgroundColor: options.format === 'jpeg' ? '#FFFFFF' : undefined,
        });
        const expectedWidth = Math.round(output.width * options.scale);
        const expectedHeight = Math.round(output.height * options.scale);
        if (canvas.width !== expectedWidth || canvas.height !== expectedHeight) {
          throw new Error(`Export size mismatch: expected ${expectedWidth}×${expectedHeight}, got ${canvas.width}×${canvas.height}.`);
        }
        const mime = options.format === 'jpeg' ? 'image/jpeg' : `image/${options.format}`;
        return await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The browser could not encode this slide.')), mime, options.quality);
        });
      } finally { busy = false; }
    },
  };
}

export async function renderSlideToBlob(
  project: Project,
  slideId: string,
  outputId: string,
  options: RenderOptions,
): Promise<Blob> {
  const slideIndex = project.slides.findIndex((slide) => slide.id === slideId);
  const slide = project.slides[slideIndex];
  const output = project.outputs.find((item) => item.id === outputId);
  if (!slide) throw new Error(`Slide "${slideId}" was not found.`);
  if (!output) throw new Error(`Output "${outputId}" was not found.`);
  return createRenderSession().render({ project, slide, output, slideIndex, options });
}
