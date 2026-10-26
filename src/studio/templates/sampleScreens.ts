import { createDemoAssets } from '../model/demo';
import type { Asset, Project } from '../model/types';

let samples: Asset[] | null = null;

/** Whether any device in the project shows a screenshot yet. */
export function hasScreenshots(project: Project): boolean {
  return project.slides.some((slide) => slide.elements.some((element) => element.type === 'device' && element.screen.assetId));
}

/**
 * A project without screenshots, with sample app screens dropped into its devices so templates have something to
 * show. Used for both the previews and the applied result, so what you pick is what you get; dropping a real
 * screenshot on a device replaces its sample.
 */
export function withSampleScreens(project: Project): Project {
  if (hasScreenshots(project)) return project;
  samples ??= createDemoAssets().map((asset) => ({ ...asset, sample: true }));
  const assets = { ...project.assets };
  for (const asset of samples) assets[asset.id] = asset;
  return {
    ...project,
    assets,
    slides: project.slides.map((slide, index) => {
      let placed = false;
      return {
        ...slide,
        elements: slide.elements.map((element) => {
          if (placed || element.type !== 'device') return element;
          placed = true;
          return { ...element, screen: { ...element.screen, assetId: samples![index % samples!.length].id } };
        }),
      };
    }),
  };
}

/** Earlier builds drew different sample screens; their names map to the screen that replaced each one. */
const LEGACY_SAMPLES: Record<string, number> = { 'Overview.svg': 0, 'Insights.svg': 1, 'Activity.svg': 2, 'Goals.svg': 3 };

/** Swap sample screens saved by an earlier build for the current ones, keeping their ids so devices still point at them. */
export function refreshSampleScreens(project: Project): Project {
  samples ??= createDemoAssets().map((asset) => ({ ...asset, sample: true }));
  const current = new Set(samples.map((asset) => asset.src));
  let changed = false;
  const assets = { ...project.assets };
  for (const asset of Object.values(project.assets)) {
    if (!asset.sample || current.has(asset.src)) continue;
    const replacement = samples[LEGACY_SAMPLES[asset.name] ?? 0];
    assets[asset.id] = { ...asset, name: replacement.name, src: replacement.src };
    changed = true;
  }
  return changed ? { ...project, assets } : project;
}
