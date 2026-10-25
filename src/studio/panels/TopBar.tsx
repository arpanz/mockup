import { useEffect, useRef, useState, type ReactElement } from 'react';
import { FilePlus2, FolderOpen, ImagePlus, Menu as MenuIcon, Redo2, Save, Sparkles, Trash2, Undo2 } from 'lucide-react';
import { createDemoProject } from '../model/demo';
import { useEditor } from '../store/editorStore';
import { downloadProjectFile, readProjectFile } from '../store/persistence';
import { Dialog, Kbd, Tooltip, useToast } from '../ui';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl';

export function TopBar({ onAddScreenshots }: { onAddScreenshots: () => void }) {
  const name = useEditor((state) => state.project.name);
  const canUndo = useEditor((state) => state.past.length > 0);
  const canRedo = useEditor((state) => state.future.length > 0);
  const preview = useEditor((state) => state.mode === 'preview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const openInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent) => {
      if (!(event.target as HTMLElement).closest('[data-top-menu]')) setMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', escape);
    };
  }, [menuOpen]);

  if (preview) return null;

  const item = (icon: ReactElement, label: string, onSelect: () => void, shortcut?: string, danger?: boolean) => (
    <button
      type="button"
      onClick={() => {
        setMenuOpen(false);
        onSelect();
      }}
      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${danger ? 'text-red-300 hover:bg-red-500/10' : 'text-zinc-200 hover:bg-white/[0.06]'}`}
    >
      <span className="text-zinc-400">{icon}</span>
      <span className="flex-1">{label}</span>
      {shortcut && <span className="text-[11px] text-zinc-500">{shortcut}</span>}
    </button>
  );

  return (
    <>
      <div data-top-menu className="absolute left-4 top-4 z-40 flex h-11 items-center gap-1 rounded-xl border border-white/[0.08] bg-zinc-900/90 p-1 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <Tooltip content="Menu" side="bottom">
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setMenuOpen((value) => !value)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${menuOpen ? 'bg-white/10 text-white' : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'}`}
          >
            <MenuIcon size={17} />
          </button>
        </Tooltip>
        <div className="mx-1 h-5 w-px bg-white/10" />
        <input
          value={name}
          onChange={(event) => useEditor.getState().renameProject(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && (event.target as HTMLInputElement).blur()}
          aria-label="Project name"
          className="h-8 w-44 rounded-md bg-transparent px-2 text-[13px] font-semibold text-zinc-100 outline-none transition-colors hover:bg-white/[0.04] focus:bg-white/[0.06]"
        />
        <div className="mx-1 h-5 w-px bg-white/10" />
        <Tooltip content="Undo" shortcut={`${MOD}Z`} side="bottom">
          <button type="button" aria-label="Undo" disabled={!canUndo} onClick={() => useEditor.getState().undo()} className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-30">
            <Undo2 size={16} />
          </button>
        </Tooltip>
        <Tooltip content="Redo" shortcut={`${MOD}⇧Z`} side="bottom">
          <button type="button" aria-label="Redo" disabled={!canRedo} onClick={() => useEditor.getState().redo()} className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-30">
            <Redo2 size={16} />
          </button>
        </Tooltip>
        <div className="mx-1 h-5 w-px bg-white/10" />
        <Tooltip content="Add screenshots" shortcut="⌥S" side="bottom">
          <button type="button" onClick={onAddScreenshots} className="flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.06] hover:text-white">
            <ImagePlus size={16} /> Add
          </button>
        </Tooltip>

        {menuOpen && (
          <div className="absolute left-0 top-[52px] w-64 rounded-xl border border-white/10 bg-zinc-900/95 p-1.5 shadow-2xl backdrop-blur-xl">
            {item(<FilePlus2 size={15} />, 'New project', () => setConfirmNew(true))}
            {item(<FolderOpen size={15} />, 'Open project…', () => openInputRef.current?.click())}
            {item(<Save size={15} />, 'Save project file', () => downloadProjectFile(useEditor.getState().project))}
            <div className="my-1 h-px bg-white/[0.06]" />
            {item(<Sparkles size={15} />, 'Load demo project', () => useEditor.getState().loadProject(createDemoProject()))}
            {item(<ImagePlus size={15} />, 'Add screenshots…', onAddScreenshots, '⌥S')}
            <div className="my-1 h-px bg-white/[0.06]" />
            <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Shortcuts</div>
            <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-2.5 pb-2 text-[12px] text-zinc-400">
              <span>Pan</span><span><Kbd>Space</Kbd> drag</span>
              <span>Zoom</span><span><Kbd>{MOD}</Kbd> scroll</span>
              <span>Fit all</span><Kbd>⇧1</Kbd>
              <span>Preview</span><Kbd>P</Kbd>
              <span>Duplicate</span><Kbd>{MOD}D</Kbd>
              <span>Edit text</span><Kbd>Enter</Kbd>
              <span>Export</span><Kbd>{MOD}⇧E</Kbd>
            </div>
          </div>
        )}
      </div>

      <input
        ref={openInputRef}
        type="file"
        accept=".frameflow,application/json"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          try {
            useEditor.getState().loadProject(await readProjectFile(file));
            toast({ title: 'Project opened', tone: 'success' });
          } catch (error) {
            toast({ title: 'Could not open project', description: error instanceof Error ? error.message : undefined, tone: 'error' });
          }
        }}
      />

      <Dialog
        open={confirmNew}
        onOpenChange={setConfirmNew}
        title="Start a new project?"
        description="Your current project is replaced. Save a project file first if you want to keep it."
        footer={(
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmNew(false)} className="h-8 rounded-lg px-3 text-[13px] text-zinc-300 hover:bg-white/[0.06]">Cancel</button>
            <button
              type="button"
              onClick={() => {
                useEditor.getState().newProject();
                setConfirmNew(false);
              }}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-red-500/90 px-3 text-[13px] font-medium text-white hover:bg-red-500"
            >
              <Trash2 size={14} /> Start fresh
            </button>
          </div>
        )}
      >
        {null}
      </Dialog>
    </>
  );
}
