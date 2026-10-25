import { useCallback, useRef, useState } from 'react';
import type { Project } from '../model/types';
import { exportProject, type ExportJob, type ExportProgress } from './exportProject';

export interface ExportState {
  status: 'idle' | 'running' | 'done' | 'error' | 'cancelled';
  progress?: ExportProgress;
  error?: string;
  result?: { files: number; bytes: number };
}

export function useExport(): {
  run(project: Project, job: ExportJob): Promise<void>;
  cancel(): void;
  state: ExportState;
} {
  const [state, setState] = useState<ExportState>({ status: 'idle' });
  const controllerRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => controllerRef.current?.abort(), []);
  const run = useCallback(async (project: Project, job: ExportJob) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: 'running', progress: { done: 0, total: 0, current: 'Preparing export…' } });
    let latestProgress: ExportProgress | undefined;
    try {
      const result = await exportProject(project, job, (progress) => {
        latestProgress = progress;
        if (!controller.signal.aborted) setState({ status: 'running', progress });
      }, controller.signal);
      setState({ status: 'done', progress: latestProgress, result });
    } catch (error) {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
        setState({ status: 'cancelled' });
      } else {
        setState({ status: 'error', error: error instanceof Error ? error.message : 'Export failed.' });
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, []);

  return { run, cancel, state };
}
