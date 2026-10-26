import { memo, useMemo } from 'react';
import type { OutputSpec, Project } from '../model/types';
import { SlideRenderer } from '../render/SlideRenderer';

/**
 * One slide drawn at thumbnail size. It renders at 2× the thumbnail rather than the export size: everything is laid
 * out in canvas-relative units, so it looks identical, but the browser paints a small layer instead of a 2868px one.
 */
function SlideThumbImpl({ project, slideIndex, output, width, radius = 0 }: { project: Project; slideIndex: number; output: OutputSpec; width: number; radius?: number }) {
  const height = (width * output.height) / output.width;
  const renderOutput = useMemo(() => ({ ...output, width: width * 2, height: height * 2 }), [output, width, height]);
  const slide = project.slides[slideIndex];
  if (!slide) return null;
  return (
    <div className="shrink-0 overflow-hidden" style={{ width, height, borderRadius: radius }}>
      <div style={{ width: renderOutput.width, height: renderOutput.height, transform: 'scale(.5)', transformOrigin: 'top left' }}>
        <SlideRenderer project={project} slide={slide} output={renderOutput} slideIndex={slideIndex} />
      </div>
    </div>
  );
}

export const SlideThumb = memo(SlideThumbImpl);
