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
