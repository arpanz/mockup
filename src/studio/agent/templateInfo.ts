import { OUTPUT_CATALOG } from '../model/outputs';
import type { Slide } from '../model/types';
import { TEMPLATES, type Template } from '../templates/catalog';

/** What a template does that changes how copy and screenshots land, so an agent can pick one without seeing it. */
export interface TemplateInfo {
  id: string;
  name: string;
  category: Template['category'];
  description: string;
  /** False: headline-only. Subtitles are hidden unless the spec sets `subtitles: true`. */
  subtitles: boolean;
  /** 1-based slide numbers, within the first eight, that show no text (device-only close-ups). */
  textless: number[];
  /** 1-based slide numbers, within the first eight, that also show the next screenshot in a second phone. */
  twoPhones: number[];
  /** One background across the whole set, with phones crossing from one screenshot into the next. */
  panorama: boolean;
}

const PROBE = 8;

const isTitle = (element: Slide['elements'][number]) => element.type === 'text' && element.role === 'title';
const isSubtitle = (element: Slide['elements'][number]) => element.type === 'text' && element.role === 'subtitle';

export function describeTemplate(template: Template): TemplateInfo {
  const screens = Array.from({ length: PROBE }, (_, index) => `probe-${index}`);
  const { slides, span } = template.build(screens, Array.from({ length: PROBE }, () => ({ title: 'Title', subtitle: 'Subtitle' })));
  const numbered = (test: (slide: Slide) => boolean) => slides.flatMap((slide, index) => test(slide) ? [index + 1] : []);
  return {
    id: template.id,
    name: template.name,
    category: template.category,
    description: template.description,
    subtitles: slides.some((slide) => slide.elements.some((element) => isSubtitle(element) && element.visible)),
    textless: numbered((slide) => !slide.elements.some((element) => isTitle(element) && element.visible)),
    twoPhones: numbered((slide) => slide.elements.filter((element) => element.type === 'device').length > 1),
    panorama: span.enabled,
  };
}

export const templateInfos = () => TEMPLATES.map(describeTemplate);

export const sizeInfos = () => OUTPUT_CATALOG.map(({ id, label, store, family, width, height, required }) => ({ id, label, store, family, width, height, required: Boolean(required) }));
