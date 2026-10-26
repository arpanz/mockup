import { useEditor } from '../store/editorStore';
import { notify } from '../editor/notify';

/**
 * Puts one slide on the clipboard as a PNG, ready to paste into Slack, Figma or a doc. The ClipboardItem is created
 * synchronously with a pending blob so Safari still counts it as part of the click or key press.
 */
export async function copySlideImage(slideId: string, outputId?: string) {
  const { project } = useEditor.getState();
  const output = project.outputs.find((item) => item.id === outputId) ?? project.outputs[0];
  if (!output) return;
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    notify({ title: 'Copying images isn’t supported in this browser', description: 'Use Export instead.', tone: 'error' });
    return;
  }
  const blob = import('./renderSlide').then(({ renderSlideToBlob }) => renderSlideToBlob(project, slideId, output.id, { format: 'png', quality: 1, scale: 1 }));
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    const index = project.slides.findIndex((slide) => slide.id === slideId);
    notify({ title: `Screenshot ${index + 1} copied`, description: `${output.width} × ${output.height} PNG — paste it anywhere.`, tone: 'success' });
  } catch {
    notify({ title: 'Couldn’t copy the image', description: 'Your browser blocked clipboard access. Use Export instead.', tone: 'error' });
  }
}
