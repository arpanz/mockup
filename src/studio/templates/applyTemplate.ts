import { createText } from '../model/defaults';
import type { Project, TextElement } from '../model/types';
import type { Template } from './catalog';

export function applyTemplate(project: Project, template: Template): Project {
  const screenIds = project.slides.map((slide) => slide.elements.find((element) => element.type === 'device')?.type === 'device'
    ? (slide.elements.find((element) => element.type === 'device') as Extract<typeof slide.elements[number], { type: 'device' }>).screen.assetId
    : null);
  const copies = template.defaultCopy.map((entry, index) => {
    const slide = project.slides[index];
    if (!slide) return entry;
    const title = slide.elements.find((element): element is TextElement => element.type === 'text' && element.role === 'title');
    const subtitle = slide.elements.find((element): element is TextElement => element.type === 'text' && element.role === 'subtitle');
    const defaultTitle = createText('title').text;
    const defaultSubtitle = createText('subtitle').text;
    return {
      title: title && title.text !== defaultTitle ? title.text : entry.title,
      subtitle: subtitle && subtitle.text !== defaultSubtitle ? subtitle.text : entry.subtitle,
    };
  });
  // Keep the user's screenshot count; an empty project gets the template's full set.
  const count = project.slides.length || template.defaultCopy.length;
  const copyItems = Array.from({ length: count }, (_, index) => copies[index] ?? template.defaultCopy[index % template.defaultCopy.length]);
  const screens = Array.from({ length: count }, (_, index) => screenIds[index] ?? null);
  const designed = template.build(screens, copyItems);
  return {
    ...project,
    slides: designed.slides.map((slide, index) => ({ ...slide, name: project.slides[index]?.name ?? slide.name })),
    span: designed.span,
    updatedAt: Date.now(),
  };
}
