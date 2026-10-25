import { useEffect, useState } from 'react';
import { getFont } from './fontCatalog';

const loadedFamilies = new Map<string, Promise<void>>();
let connectionsAdded = false;

export function fontStack(family: string): string {
  if (family === 'SF Pro (system)') {
    return '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif';
  }
  const quoted = `"${family.replaceAll('"', '')}"`;
  const font = getFont(family);
  const fallback = font?.category === 'serif'
    ? 'Georgia, serif'
    : font?.category === 'mono'
      ? 'ui-monospace, SFMono-Regular, monospace'
      : font?.category === 'handwriting'
        ? 'cursive'
        : 'Arial, sans-serif';
  return `${quoted}, ${fallback}`;
}

function ensureConnections(): void {
  if (connectionsAdded || typeof document === 'undefined') return;
  connectionsAdded = true;
  for (const href of ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']) {
    if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) continue;
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = href;
    if (href.includes('gstatic')) link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }
}

function waitForStylesheet(link: HTMLLinkElement): Promise<void> {
  return new Promise((resolve) => {
    const timeout = window.setTimeout(resolve, 4000);
    const finish = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    link.addEventListener('load', finish, { once: true });
    link.addEventListener('error', finish, { once: true });
  });
}

export function loadFont(family: string, weights?: number[]): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const font = getFont(family);
  if (!font || font.source === 'system') return Promise.resolve();

  const validWeights = (weights?.length ? weights : font.weights)
    .filter((weight) => font.weights.includes(weight));
  const requestedWeights = validWeights.length ? validWeights : [font.weights[0]];
  let task = loadedFamilies.get(family);
  if (!task) {
    ensureConnections();
    const sorted = [...font.weights].sort((a, b) => a - b);
    // Google Fonts wants one full tuple per style: ital,wght@0,400;0,700;1,400;1,700
    const axisSpec = font.italic
      ? `ital,wght@${[0, 1].flatMap((ital) => sorted.map((weight) => `${ital},${weight}`)).join(';')}`
      : `wght@${sorted.join(';')}`;
    // Build the query by hand: Google Fonts reads `+` as a space and rejects it percent-encoded.
    const query = `family=${encodeURIComponent(family).replaceAll('%20', '+')}:${axisSpec}&display=swap`;
    const existing = document.head.querySelector<HTMLLinkElement>(
      `link[rel="stylesheet"][data-font-family="${CSS.escape(family)}"]`,
    );
    const link = existing ?? document.createElement('link');
    if (!existing) {
      link.rel = 'stylesheet';
      // CORS mode lets the exporter read these rules to embed the fonts in PNGs.
      link.crossOrigin = 'anonymous';
      link.href = `https://fonts.googleapis.com/css2?${query}`;
      link.dataset.fontFamily = family;
      document.head.appendChild(link);
    }
    task = waitForStylesheet(link);
    loadedFamilies.set(family, task);
  }

  const descriptors = requestedWeights.flatMap((weight) => [
    `${weight} 32px "${family}"`,
    ...(font.italic ? [`italic ${weight} 32px "${family}"`] : []),
  ]);
  return task.then(async () => {
    if (!document.fonts) return;
    await Promise.race([
      Promise.all(descriptors.map((descriptor) => document.fonts.load(descriptor)))
        .then(() => undefined),
      new Promise<void>((resolve) => window.setTimeout(resolve, 4000)),
    ]).catch(() => undefined);
  }).catch(() => undefined);
}

export function loadFonts(families: Iterable<string>): Promise<void> {
  return Promise.all([...new Set(families)].map((family) => loadFont(family)))
    .then(() => undefined);
}

export function useFont(family: string, weight = 400): boolean {
  const [loaded, setLoaded] = useState(() =>
    family === 'SF Pro (system)' ||
    (typeof document !== 'undefined' && document.fonts?.check(`${weight} 16px "${family}"`) === true),
  );
  useEffect(() => {
    let active = true;
    setLoaded(family === 'SF Pro (system)');
    void loadFont(family, [weight]).then(() => {
      if (active) setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [family, weight]);
  return loaded;
}
