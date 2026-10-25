import { memo } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import type { Background } from '../model/types';
import { hexToRgba } from '../model/units';
import { getPattern } from './patterns';

export interface BackgroundLayerProps {
  background: Background;
  width: number;
  height: number;
  unit: number;
  resolveAsset: (assetId: string) => string | undefined;
}

let grainUrl: string | undefined;
function getGrainUrl(): string {
  if (!grainUrl) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">' +
      '<filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".82" numOctaves="3" ' +
      'stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#n)" opacity=".8"/></svg>';
    grainUrl = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }
  return grainUrl;
}

const gradientStops = (stops: { color: string; position: number }[]) =>
  stops.map((stop) => `${hexToRgba(stop.color)} ${Math.round(stop.position * 100)}%`).join(', ');

function BackgroundLayerView({ background, width, height, unit, resolveAsset }: BackgroundLayerProps): ReactElement {
  let style: CSSProperties = { position: 'absolute', inset: 0, overflow: 'hidden' };
  let content: ReactElement | null = null;
  let vignette = false;

  if (background.kind === 'solid') style.background = background.color;
  if (background.kind === 'linear') {
    style.background = `linear-gradient(${background.angle}deg, ${gradientStops(background.stops)})`;
  }
  if (background.kind === 'radial') {
    style.background = `radial-gradient(ellipse at ${background.cx * 100}% ${background.cy * 100}%, ` +
      `${gradientStops(background.stops)})`;
  }
  if (background.kind === 'mesh') {
    const minSize = Math.min(width, height);
    const blur = Math.max(1, minSize * 0.06);
    const points = background.points.map((point) => {
      const radius = Math.max(1, Math.hypot(width, height) * point.radius);
      return `radial-gradient(circle ${radius}px at ${point.x * 100}% ${point.y * 100}%, ` +
        `${hexToRgba(point.color, 0.98)}, transparent 72%)`;
    });
    style.background = background.base;
    const overscan = 12;
    content = <div style={{
      position: 'absolute',
      inset: `-${overscan}%`,
      background: `${points.join(', ')}, ${background.base}`,
      filter: `blur(${blur}px)`,
      transform: 'scale(1.02)',
    }} />;
    vignette = true;
  }
  if (background.kind === 'pattern') {
    const pattern = getPattern(background.patternId);
    style.background = background.base;
    if (pattern) {
      content = <div style={{ position: 'absolute', inset: 0 }}>
        {pattern.render({ width, height, base: background.base, colors: background.colors, scale: background.scale })}
      </div>;
    }
  }
  if (background.kind === 'image') {
    const src = resolveAsset(background.assetId);
    style.background = background.fit === 'cover' ? 'center / cover no-repeat' : 'center / contain no-repeat';
    if (src) {
      content = <div style={{
        position: 'absolute',
        inset: -Math.max(0, background.blur * unit * 0.08),
        backgroundImage: `url("${src}")`,
        backgroundPosition: 'center',
        backgroundSize: background.fit,
        backgroundRepeat: 'no-repeat',
        filter: `blur(${Math.max(0, background.blur * unit)}px)`,
        transform: 'scale(1.06)',
      }} />;
    }
  }

  return <div aria-hidden="true" style={{ ...style, isolation: 'isolate' }}>
    {content}
    {background.kind === 'image' && <div style={{ position: 'absolute', inset: 0, background: hexToRgba(background.overlay) }} />}
    {vignette && <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      background: 'radial-gradient(ellipse at center, transparent 48%, rgba(0, 0, 0, 0.12) 100%)',
    }} />}
    {background.noise > 0 && <div style={{
      position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
      backgroundImage: getGrainUrl(), backgroundSize: '180px 180px', mixBlendMode: 'soft-light',
      opacity: Math.min(0.2, background.noise * 0.72),
    }} />}
  </div>;
}

export const BackgroundLayer = memo(BackgroundLayerView);
