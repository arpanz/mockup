import { useEffect, useState } from 'react';
import type { Project } from '../model/types';

/** Template thumbnails draw screenshots ~300px tall; decoding the full 1290×2796 originals for that stalls scrolling. */
const THUMB_HEIGHT = 640;
const cache = new Map<string, Promise<string>>();

function shrink(src: string): Promise<string> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, THUMB_HEIGHT / image.naturalHeight);
      if (scale === 1) return resolve(src);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = THUMB_HEIGHT;
      const context = canvas.getContext('2d');
      if (!context) return resolve(src);
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : src), 'image/webp', 0.9);
    };
    image.onerror = () => resolve(src);
    image.src = src;
  });
}

function thumbnail(assetId: string, src: string): Promise<string> {
  const key = `${assetId}:${src.length}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = shrink(src);
    cache.set(key, pending);
  }
  return pending;
}

/** The project's assets with the given ones swapped for small cached copies; null until they're ready. */
export function usePreviewAssets(assets: Project['assets'], ids: Array<string | null>): Project['assets'] | null {
  const [result, setResult] = useState<Project['assets'] | null>(null);
  const key = ids.join('|');
  useEffect(() => {
    let cancelled = false;
    const wanted = Array.from(new Set(ids.filter((id): id is string => Boolean(id && assets[id]))));
    void Promise.all(wanted.map(async (id) => [id, await thumbnail(id, assets[id].src)] as const)).then((entries) => {
      if (cancelled) return;
      const next = { ...assets };
      for (const [id, src] of entries) next[id] = { ...assets[id], src };
      setResult(next);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, key]);
  return result;
}
