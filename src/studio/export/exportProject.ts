import type { Project } from '../model/types';
import { createRenderSession, type RenderOptions } from './renderSlide';

export interface ExportJob {
  slideIds?: string[];
  outputIds?: string[];
  options: RenderOptions;
  zip: boolean;
}

export interface ExportProgress {
  done: number;
  total: number;
  current: string;
}

export type PlannedExportFile = { folder: string; filename: string; slideId: string; outputId: string };

function safeName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim() || 'Untitled';
}

export function exportFilePlan(project: Project, job: ExportJob): PlannedExportFile[] {
  const slides = job.slideIds
    ? job.slideIds.map((id) => project.slides.find((slide) => slide.id === id)).filter((slide) => slide !== undefined)
    : project.slides;
  const outputs = job.outputIds
    ? job.outputIds.map((id) => project.outputs.find((output) => output.id === id)).filter((output) => output !== undefined)
    : project.outputs;
  return outputs.flatMap((output) => slides.map((slide) => ({
    folder: safeName(`${output.label} (${output.width}x${output.height})`),
    filename: safeName(`${String(project.slides.indexOf(slide) + 1).padStart(2, '0')} ${slide.name}.${job.options.format}`),
    slideId: slide.id,
    outputId: output.id,
  })));
}

function abortError(): DOMException {
  return new DOMException('Export cancelled.', 'AbortError');
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function exportProject(
  project: Project,
  job: ExportJob,
  onProgress?: (progress: ExportProgress) => void,
  signal?: AbortSignal,
): Promise<{ files: number; bytes: number }> {
  const plan = exportFilePlan(project, job);
  if (!plan.length) throw new Error('Select at least one slide and one output size to export.');
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const session = createRenderSession();
  let bytes = 0;
  let done = 0;
  for (const item of plan) {
    if (signal?.aborted) throw abortError();
    const slideIndex = project.slides.findIndex((slide) => slide.id === item.slideId);
    const slide = project.slides[slideIndex];
    const output = project.outputs.find((candidate) => candidate.id === item.outputId);
    if (!slide || !output) continue;
    const blob = await session.render({ project, slide, output, slideIndex, options: job.options });
    bytes += blob.size;
    zip.folder(item.folder)?.file(item.filename, blob);
    done += 1;
    onProgress?.({ done, total: plan.length, current: `${output.label} · ${slide.name}` });
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  }
  if (signal?.aborted) throw abortError();
  if (job.zip || plan.length > 1) {
    // Multiple downloads are commonly blocked by browsers, so multi-file exports always use one ZIP.
    const archive = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
    download(archive, `${safeName(project.name)} Screenshots.zip`);
  } else {
    const outputFolder = zip.folder(plan[0].folder);
    const image = outputFolder?.file(plan[0].filename);
    if (!image) throw new Error('The exported file could not be prepared for download.');
    download(await image.async('blob'), plan[0].filename);
  }
  return { files: done, bytes };
}
