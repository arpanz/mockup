import { useMemo, useState } from 'react';
import { Check, ChevronRight, Download, FileArchive, FileImage, Folder, X } from 'lucide-react';
import { exportFilePlan, type ExportJob } from '../export/exportProject';
import type { RenderOptions } from '../export/renderSlide';
import { useExport } from '../export/useExport';
import { useEditor } from '../store/editorStore';
import { Button, Checkbox, Field, Section, Segmented, SliderField } from '../ui';

const formatBytes = (bytes: number) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);

export function ExportPanel({ onClose }: { onClose: () => void }) {
  const project = useEditor((state) => state.project);
  const [outputIds, setOutputIds] = useState<string[]>(() => project.outputs.map((output) => output.id));
  const [scope, setScope] = useState<'all' | 'current'>('all');
  const [format, setFormat] = useState<RenderOptions['format']>('png');
  const [quality, setQuality] = useState(92);
  const [scale, setScale] = useState<number>(1);
  const activeSlideId = useEditor((state) => state.selection.slideId);
  const { run, cancel, state } = useExport();

  const job: ExportJob = {
    outputIds: project.outputs.filter((output) => outputIds.includes(output.id)).map((output) => output.id),
    slideIds: scope === 'current' && activeSlideId ? [activeSlideId] : undefined,
    options: { format, quality: quality / 100, scale },
    zip: true,
  };
  const plan = useMemo(() => exportFilePlan(project, job), [project, JSON.stringify(job)]); // eslint-disable-line react-hooks/exhaustive-deps
  const folders = Array.from(new Set(plan.map((file) => file.folder)));
  const running = state.status === 'running';
  const missingScreens = project.slides.filter((slide) => slide.elements.some((element) => element.type === 'device' && element.visible && !element.screen.assetId)).length;

  return (
    <aside className="absolute bottom-4 right-4 top-4 z-30 max-[1040px]:top-[72px] flex w-[320px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-900/95 shadow-[0_16px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
        <div>
          <h2 className="text-[14px] font-semibold text-white">Export</h2>
          <p className="text-[12px] text-zinc-500">Store-ready, pixel-exact screenshots</p>
        </div>
        <button type="button" aria-label="Close export" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-white/[0.08] hover:text-zinc-100">
          <X size={15} />
        </button>
      </div>

      <div data-scrollable className="min-h-0 flex-1 overflow-y-auto">
        <Section title="Sizes" collapsible={false}>
          {project.outputs.map((output) => {
            const checked = outputIds.includes(output.id);
            return (
              <label key={output.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1 text-[12.5px] hover:bg-white/[0.03]">
                <Checkbox checked={checked} onChange={(value) => setOutputIds((ids) => (value ? [...ids, output.id] : ids.filter((id) => id !== output.id)))} />
                <span className="flex-1 text-zinc-200">{output.label}</span>
                <span className="tabular-nums text-zinc-500">{output.width * scale}×{output.height * scale}</span>
              </label>
            );
          })}
        </Section>

        <Section title="Screenshots" collapsible={false}>
          <Segmented
            fullWidth
            value={scope}
            onChange={(value) => setScope(value as 'all' | 'current')}
            options={[{ value: 'all', label: `All ${project.slides.length}` }, { value: 'current', label: 'Selected only' }]}
          />
          {missingScreens > 0 && (
            <p className="rounded-md bg-amber-400/10 px-2.5 py-2 text-[12px] leading-relaxed text-amber-200">
              {missingScreens} screenshot{missingScreens > 1 ? 's have' : ' has'} a device without an image — it exports with a placeholder screen.
            </p>
          )}
        </Section>

        <Section title="Format" collapsible={false}>
          <Segmented fullWidth value={format} onChange={(value) => setFormat(value as RenderOptions['format'])} options={[{ value: 'png', label: 'PNG' }, { value: 'jpeg', label: 'JPEG' }, { value: 'webp', label: 'WebP' }]} />
          {format !== 'png' && <SliderField label="Quality" value={quality} min={50} max={100} step={1} unit="%" defaultValue={92} onChange={setQuality} />}
          <Field label="Scale">
            <Segmented fullWidth size="sm" value={String(scale)} onChange={(value) => setScale(Number(value))} options={[{ value: '0.5', label: '0.5×' }, { value: '1', label: '1× store' }, { value: '2', label: '2×' }]} />
          </Field>
          {scale !== 1 && <p className="text-[11px] text-zinc-500">Stores expect 1× sizes. Use other scales for previews or print.</p>}
        </Section>

        <Section title={`Output · ${plan.length} files`} collapsible={false}>
          <div className="rounded-lg bg-black/25 p-2 text-[12px]">
            <div className="flex items-center gap-1.5 px-1 pb-1 text-zinc-300">
              <FileArchive size={13} className="text-indigo-300" />
              <span className="truncate">{project.name} Screenshots.zip</span>
            </div>
            {folders.map((folder) => {
              const files = plan.filter((file) => file.folder === folder);
              return (
                <details key={folder} className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded px-1 py-1 text-zinc-300 hover:bg-white/[0.04]">
                    <ChevronRight size={12} className="text-zinc-500 transition-transform group-open:rotate-90" />
                    <Folder size={13} className="text-zinc-500" />
                    <span className="flex-1 truncate">{folder}</span>
                    <span className="text-zinc-600">{files.length}</span>
                  </summary>
                  {files.map((file) => (
                    <div key={file.filename} className="flex items-center gap-1.5 py-0.5 pl-8 text-zinc-500">
                      <FileImage size={12} /> <span className="truncate">{file.filename}</span>
                    </div>
                  ))}
                </details>
              );
            })}
          </div>
        </Section>
      </div>

      <div className="border-t border-white/[0.06] p-3">
        {running && state.progress && (
          <div className="mb-2.5">
            <div className="mb-1 flex justify-between text-[11px] text-zinc-400">
              <span className="truncate">{state.progress.current}</span>
              <span className="tabular-nums">{state.progress.done}/{state.progress.total || plan.length}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-indigo-500 transition-[width] duration-200" style={{ width: `${(state.progress.done / Math.max(1, state.progress.total || plan.length)) * 100}%` }} />
            </div>
          </div>
        )}
        {state.status === 'done' && state.result && (
          <p className="mb-2.5 flex items-center gap-1.5 text-[12px] text-emerald-300">
            <Check size={13} /> {state.result.files} files · {formatBytes(state.result.bytes)} saved to your downloads
          </p>
        )}
        {state.status === 'error' && <p className="mb-2.5 text-[12px] text-red-300">{state.error}</p>}
        {running ? (
          <Button variant="secondary" size="md" onClick={cancel} className="w-full">Cancel</Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            icon={<Download size={15} />}
            disabled={plan.length === 0}
            onClick={() => void run(project, job)}
            className="w-full"
          >
            Export {plan.length} file{plan.length === 1 ? '' : 's'}
          </Button>
        )}
      </div>
    </aside>
  );
}
