import { Download, Eye, Grid2X2, MousePointer2, ZoomIn, ZoomOut } from 'lucide-react';
import type { EditorMode } from '../model/types';
import { canvasCommands } from '../editor/Canvas';
import { useEditor } from '../store/editorStore';
import { Tooltip } from '../ui';

const MODES: Array<{ mode: EditorMode; label: string; icon: typeof Eye; shortcut?: string }> = [
  { mode: 'templates', label: 'Templates', icon: Grid2X2 },
  { mode: 'editor', label: 'Editor', icon: MousePointer2 },
  { mode: 'preview', label: 'Preview', icon: Eye, shortcut: 'P' },
  { mode: 'export', label: 'Export', icon: Download, shortcut: '⌘⇧E' },
];

export function BottomBar({ rightInset }: { rightInset: number }) {
  const mode = useEditor((state) => state.mode);
  const zoom = useEditor((state) => state.view.zoom);

  return (
    <div
      className="absolute bottom-5 z-40 flex -translate-x-1/2 items-center gap-2"
      style={{ left: `calc((100% - ${rightInset}px) / 2)` }}
    >
      <div className="flex items-center gap-0.5 rounded-xl border border-white/[0.08] bg-zinc-900/90 p-1 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        {MODES.map(({ mode: value, label, icon: Icon, shortcut }) => (
          <Tooltip key={value} content={label} shortcut={shortcut} side="top">
            <button
              type="button"
              onClick={() => useEditor.getState().setMode(value)}
              className={`relative flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-colors ${mode === value
                ? 'bg-indigo-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
                : 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100'}`}
            >
              <Icon size={15} />
              <span className="hidden md:inline">{label}</span>
            </button>
          </Tooltip>
        ))}
      </div>
      <div className="flex items-center gap-0.5 rounded-xl border border-white/[0.08] bg-zinc-900/90 p-1 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <Tooltip content="Zoom out" shortcut="⌘−" side="top">
          <button type="button" aria-label="Zoom out" onClick={() => canvasCommands.zoomBy(0.8)} className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100">
            <ZoomOut size={15} />
          </button>
        </Tooltip>
        <Tooltip content="Fit all" shortcut="⇧1" side="top">
          <button type="button" onClick={() => canvasCommands.fit()} className="h-9 w-14 rounded-lg text-center text-[12px] font-semibold tabular-nums text-zinc-200 hover:bg-white/[0.06]">
            {Math.round(zoom * 100)}%
          </button>
        </Tooltip>
        <Tooltip content="Zoom in" shortcut="⌘+" side="top">
          <button type="button" aria-label="Zoom in" onClick={() => canvasCommands.zoomBy(1.25)} className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100">
            <ZoomIn size={15} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
