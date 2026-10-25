import { memo, type CSSProperties, type ReactElement } from 'react';
import { BackgroundLayer } from '../backgrounds/BackgroundLayer';
import { DeviceFrame } from '../devices/DeviceFrame';
import { resolveDeviceModel } from '../devices/catalog';
import type { ImageElement, OutputSpec, Project, ShapeElement, Slide, StudioElement } from '../model/types';
import { baseUnit, resolveElements } from '../model/units';
import { TextBlock } from '../text/TextBlock';
import { elementBox, horizontalExtent } from './geometry';
import { boxShadow, paintCss, shadowFilter, strokeCss } from './paint';

export interface SlideRendererProps {
  project: Project;
  slide: Slide;
  output: OutputSpec;
  slideIndex: number;
  /** Editor canvas: tags elements for hit-testing and hides nothing. Export passes false. */
  interactive?: boolean;
  /** Element being edited inline — rendered invisible so the editor overlay can sit on top. */
  hiddenElementId?: string | null;
}

/** An element plus the slide offset it is drawn from (−1 / +1 for neighbours straddling the edge). */
interface PlacedElement {
  element: StudioElement;
  slideId: string;
  offset: number;
}

const STAR_PATH = 'M50 2 L61.8 35.5 L97.6 35.5 L68.9 57 L79.4 91 L50 70.5 L20.6 91 L31.1 57 L2.4 35.5 L38.2 35.5 Z';
const BLOB_PATH = 'M83.4 22.6C93.7 35 97.8 53.6 91.2 68.3 84.6 83 67.3 93.8 49.9 94.6 32.5 95.4 15 86.2 8 71.4 1 56.6 4.5 36.2 15.4 23.1 26.3 10 44.6 4.2 59.7 6.5 74.8 8.8 73.1 10.2 83.4 22.6Z';

function placedElements(project: Project, slide: Slide, slideIndex: number, output: OutputSpec): PlacedElement[] {
  const own = resolveElements(slide, output.id).map((element) => ({ element, slideId: slide.id, offset: 0 }));
  if (!project.span.enabled) return own;

  // Spanning: pull in neighbours' elements that cross into this slide so straddling devices line up.
  const neighbours: PlacedElement[] = [];
  const previous = project.slides[slideIndex - 1];
  const next = project.slides[slideIndex + 1];
  if (previous) {
    for (const element of resolveElements(previous, output.id)) {
      if (horizontalExtent(element, output)[1] > 1) neighbours.push({ element, slideId: previous.id, offset: -1 });
    }
  }
  if (next) {
    for (const element of resolveElements(next, output.id)) {
      if (horizontalExtent(element, output)[0] < 0) neighbours.push({ element, slideId: next.id, offset: 1 });
    }
  }
  return [...neighbours, ...own];
}

function ShapeView({ element, unit }: { element: ShapeElement; unit: number }) {
  const width = element.w * unit;
  const height = element.h * unit;
  const background = paintCss(element.fill);
  const blur = element.blur > 0 ? `blur(${element.blur * unit}px)` : undefined;
  if (element.shape === 'rect' || element.shape === 'ellipse') {
    return (
      <div
        style={{
          width,
          height,
          background,
          borderRadius: element.shape === 'ellipse' ? '50%' : element.radius * unit,
          border: strokeCss(element.stroke, unit),
          boxShadow: boxShadow(element.shadow, unit),
          filter: blur,
        }}
      />
    );
  }
  const gradientId = `shape-${element.id}`;
  const fill = element.fill.kind === 'solid' ? element.fill.color : `url(#${gradientId})`;
  return (
    <svg width={width} height={height} viewBox="0 0 100 100" preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible', filter: [shadowFilter(element.shadow, unit), blur].filter(Boolean).join(' ') || undefined }}>
      {element.fill.kind !== 'solid' && (
        <defs>
          {element.fill.kind === 'linear' ? (
            <linearGradient id={gradientId} gradientTransform={`rotate(${element.fill.angle - 90} 0.5 0.5)`}>
              {element.fill.stops.map((stop, index) => <stop key={index} offset={stop.position} stopColor={stop.color} />)}
            </linearGradient>
          ) : (
            <radialGradient id={gradientId} cx={element.fill.cx} cy={element.fill.cy} r="0.75">
              {element.fill.stops.map((stop, index) => <stop key={index} offset={stop.position} stopColor={stop.color} />)}
            </radialGradient>
          )}
        </defs>
      )}
      <path
        d={element.shape === 'star' ? STAR_PATH : BLOB_PATH}
        fill={fill}
        stroke={element.stroke.enabled ? element.stroke.color : 'none'}
        strokeOpacity={element.stroke.opacity}
        strokeWidth={element.stroke.enabled ? (element.stroke.width * unit * 100) / Math.max(width, 1) : 0}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function ImageView({ element, unit, src }: { element: ImageElement; unit: number; src: string | undefined }) {
  return (
    <div
      style={{
        width: element.w * unit,
        height: element.h * unit,
        borderRadius: element.radius * unit,
        overflow: 'hidden',
        border: strokeCss(element.stroke, unit),
        boxShadow: boxShadow(element.shadow, unit),
        background: src ? undefined : 'rgba(148, 163, 184, 0.25)',
      }}
    >
      {src && <img src={src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: element.fit, display: 'block' }} />}
    </div>
  );
}

function ElementView({
  placed,
  project,
  output,
  unit,
  interactive,
  hidden,
}: {
  placed: PlacedElement;
  project: Project;
  output: OutputSpec;
  unit: number;
  interactive: boolean;
  hidden: boolean;
}) {
  const { element, offset } = placed;
  const W = output.width;
  const H = output.height;
  const wrapper: CSSProperties = {
    position: 'absolute',
    left: (element.x + offset) * W,
    top: element.y * H,
    transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
    opacity: hidden ? 0 : element.opacity,
    pointerEvents: interactive && offset === 0 ? 'auto' : 'none',
  };
  const tags = interactive && offset === 0 ? { 'data-element-id': element.id } : {};

  let content: ReactElement;
  switch (element.type) {
    case 'text':
      content = <TextBlock element={element} unit={unit} canvasWidth={W} />;
      break;
    case 'device': {
      const model = resolveDeviceModel(element.model, output.family);
      const box = elementBox(element, output);
      const src = element.screen.assetId ? project.assets[element.screen.assetId]?.src ?? null : null;
      content = <DeviceFrame element={element} model={model} width={box.width} height={box.height} unit={unit} screenSrc={src} />;
      break;
    }
    case 'image':
      content = <ImageView element={element} unit={unit} src={project.assets[element.assetId]?.src} />;
      break;
    case 'shape':
      content = <ShapeView element={element} unit={unit} />;
      break;
  }

  return (
    <div style={wrapper} {...tags}>
      {content}
    </div>
  );
}

function SlideRendererImpl({ project, slide, output, slideIndex, interactive = false, hiddenElementId = null }: SlideRendererProps) {
  const W = output.width;
  const H = output.height;
  const unit = baseUnit(W, H);
  const resolveAsset = (assetId: string) => project.assets[assetId]?.src;
  const span = project.span.enabled;

  return (
    <div
      data-slide-id={interactive ? slide.id : undefined}
      style={{ position: 'relative', width: W, height: H, overflow: 'hidden', isolation: 'isolate' }}
    >
      {span ? (
        <div style={{ position: 'absolute', top: 0, left: -slideIndex * W, width: W * project.slides.length, height: H }}>
          <BackgroundLayer background={project.span.background} width={W * project.slides.length} height={H} unit={unit} resolveAsset={resolveAsset} />
        </div>
      ) : (
        <BackgroundLayer background={slide.background} width={W} height={H} unit={unit} resolveAsset={resolveAsset} />
      )}
      {placedElements(project, slide, slideIndex, output)
        .filter((placed) => placed.element.visible)
        .map((placed) => (
          <ElementView
            key={`${placed.slideId}-${placed.element.id}`}
            placed={placed}
            project={project}
            output={output}
            unit={unit}
            interactive={interactive}
            hidden={placed.offset === 0 && placed.element.id === hiddenElementId}
          />
        ))}
    </div>
  );
}

export const SlideRenderer = memo(SlideRendererImpl);
