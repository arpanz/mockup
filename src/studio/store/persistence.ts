import type { Project } from '../model/types';

const DB_NAME = 'frameflow-studio-v2';
const STORE = 'projects';
const ACTIVE_KEY = 'active';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open project storage'));
  });
}

export async function saveProject(project: Project): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(project, ACTIVE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Unable to save project'));
    });
  } finally {
    db.close();
  }
}

export async function loadProject(): Promise<Project | null> {
  const db = await openDatabase();
  try {
    return await new Promise<Project | null>((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(ACTIVE_KEY);
      request.onsuccess = () => {
        const value = request.result as Project | undefined;
        resolve(value && value.version === 2 ? value : null);
      };
      request.onerror = () => reject(request.error ?? new Error('Unable to load project'));
    });
  } finally {
    db.close();
  }
}

export function downloadProjectFile(project: Project) {
  const blob = new Blob([JSON.stringify(project)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${project.name.replace(/[\\/:*?"<>|]+/g, '').trim() || 'project'}.frameflow`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function readProjectFile(file: File): Promise<Project> {
  const parsed = JSON.parse(await file.text()) as Project;
  if (parsed?.version !== 2 || !Array.isArray(parsed.slides) || !Array.isArray(parsed.outputs)) {
    throw new Error('This is not a Frameflow v2 project file');
  }
  return parsed;
}

export function readImageFile(file: File): Promise<{ src: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read image'));
    reader.onload = () => {
      const src = String(reader.result);
      const image = new Image();
      image.onload = () => resolve({ src, width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error(`${file.name} is not a readable image`));
      image.src = src;
    };
    reader.readAsDataURL(file);
  });
}
