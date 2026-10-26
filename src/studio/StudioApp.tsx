import { useEffect, useMemo, useRef, useState } from 'react';
import { createProject } from './model/defaults';
import { useEditor } from './store/editorStore';
import { loadProject, readImageFile, saveProject } from './store/persistence';
import { Canvas, PANEL_INSET } from './editor/Canvas';
import { useShortcuts } from './editor/useShortcuts';
import { BottomBar } from './panels/BottomBar';
import { ExportPanel } from './panels/ExportPanel';
import { RightPanel } from './panels/RightPanel';
import { TemplatesOverlay } from './panels/TemplatesOverlay';
import { TopBar } from './panels/TopBar';
import { ToastProvider } from './ui';

if (import.meta.env.DEV) {
  // Dev-only handle for debugging in the browser console.
  (window as unknown as { __studio: typeof useEditor }).__studio = useEditor;
}

function useHydrateAndAutosave() {
  const hydrated = useEditor((state) => state.hydrated);

  useEffect(() => {
    let cancelled = false;
    loadProject()
      .catch(() => null)
      .then((saved) => {
        if (cancelled) return;
        const store = useEditor.getState();
        store.loadProject(saved ?? createProject());
        // First visit: start by picking a look rather than editing an empty project.
        if (!saved) store.setMode('templates');
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let timer: number | undefined;
    const unsubscribe = useEditor.subscribe((state, previous) => {
      if (state.project === previous.project) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void saveProject(useEditor.getState().project).catch(() => {
          // Quota errors etc. — the project stays in memory; nothing else to do here.
        });
      }, 600);
    });
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [hydrated]);

  return hydrated;
}

export function StudioApp() {
  const hydrated = useHydrateAndAutosave();
  const mode = useEditor((state) => state.mode);
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth >= 900);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showPanel = panelOpen && mode !== 'preview';
  const rightInset = showPanel ? PANEL_INSET : 0;

  const handlers = useMemo(() => ({
    openFilePicker: () => fileInputRef.current?.click(),
    openExport: () => {
      useEditor.getState().setMode('export');
      setPanelOpen(true);
    },
  }), []);
  useShortcuts(handlers);

  return (
    <ToastProvider>
      <div className="studio relative h-dvh w-full overflow-hidden bg-[#0c0c0e] font-sans text-zinc-100 antialiased">
        {/* Wait for the saved project so the UI never flashes an empty "Untitled project" first. */}
        {hydrated && (
          <>
            <Canvas rightInset={rightInset} />
            <TopBar onAddScreenshots={handlers.openFilePicker} />
            <BottomBar rightInset={rightInset} />
            {mode === 'templates' && <TemplatesOverlay rightInset={rightInset} />}
            {showPanel && (mode === 'export' ? <ExportPanel onClose={() => useEditor.getState().setMode('editor')} /> : <RightPanel onCollapse={() => setPanelOpen(false)} />)}
            {!showPanel && mode !== 'preview' && (
              <button
                type="button"
                onClick={() => setPanelOpen(true)}
                className="absolute right-4 top-4 z-30 h-9 rounded-xl border border-white/10 bg-zinc-900/90 px-3 text-xs font-medium text-zinc-300 shadow-2xl backdrop-blur hover:text-white"
              >
                Show panel
              </button>
            )}
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={async (event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = '';
            const results = await Promise.allSettled(files.map(async (file) => ({ name: file.name, ...(await readImageFile(file)) })));
            const assets = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
            const { placeScreenshots, selection } = useEditor.getState();
            placeScreenshots(assets, selection.slideId ?? undefined);
          }}
        />
      </div>
    </ToastProvider>
  );
}
