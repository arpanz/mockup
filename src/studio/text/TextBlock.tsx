import { memo, useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import type { Paint, TextElement } from '../model/types';
import { hexToRgba } from '../model/units';
import { fontStack, useFont } from './fontLoader';
import { parseRichText } from './richText';

export interface TextBlockProps {
  element: TextElement;
  unit: number;
  canvasWidth: number;
}

function paintCss(paint: Paint): string {
  if (paint.kind === 'solid') return paint.color;
  const stops = paint.stops
    .map((stop) => `${stop.color} ${stop.position * 100}%`)
    .join(', ');
  return paint.kind === 'linear'
    ? `linear-gradient(${paint.angle}deg, ${stops})`
    : `radial-gradient(at ${paint.cx * 100}% ${paint.cy * 100}%, ${stops})`;
}

function paintTextStyle(paint: Paint): CSSProperties {
  if (paint.kind === 'solid') return { color: paint.color };
  return {
    backgroundImage: paintCss(paint),
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
    WebkitTextFillColor: 'transparent',
  };
}

function strokeStyle(
  enabled: boolean,
  width: number,
  color: string,
  opacity: number,
  unit: number,
): CSSProperties {
  if (!enabled || width <= 0) return {};
  return {
    WebkitTextStroke: `${width * unit}px ${hexToRgba(color, opacity)}`,
    paintOrder: 'stroke fill',
  } as CSSProperties;
}

function brushStroke(color: string): string {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 12">',
    `<path d="M2 8 C25 3 55 10 98 3" fill="none" stroke="${color}"`,
    ' stroke-width="7" stroke-linecap="round"/>',
    '</svg>',
  ].join('');
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Base64, not URL-encoded: html-to-image's export pipeline mangles URL-encoded SVG backgrounds. */
const svgUrl = (svg: string) => `url("data:image/svg+xml;base64,${btoa(svg)}")`;

/** One repeating tile of a wavy or zigzag underline, drawn in em so it scales with the type. */
function lineTile(kind: 'wave' | 'zigzag', color: string): string {
  const path = kind === 'wave' ? 'M0 4 Q5 0.6 10 4 T20 4' : 'M0 6 L5 1.6 L10 6 L15 1.6 L20 6';
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 8"><path d="${path}" fill="none" stroke="${color}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
}

/** A hand-drawn loop that doesn't quite close, stretched around the word. */
function circleStroke(color: string): string {
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80" preserveAspectRatio="none"><path d="M36 14 C86 0 184 6 193 36 C200 64 124 78 74 74 C24 70 4 54 9 35 C14 18 52 6 122 9" fill="none" stroke="${color}" stroke-width="4.5" stroke-linecap="round"/></svg>`);
}

/** The look of accented words (*like this*), shared with the inspector's style previews. */
export function accentCss(accent: TextElement['accent']): CSSProperties {
  const clone = { boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' } as const;
  switch (accent.style) {
    case 'color':
      return { color: accent.color, WebkitTextFillColor: accent.color };
    case 'highlight':
      return {
        color: accent.textColor,
        backgroundColor: accent.color,
        padding: '0.08em 0.12em 0',
        borderRadius: '0.12em',
        transform: 'skew(-1deg)',
        ...clone,
      };
    case 'underline':
      return {
        backgroundImage: brushStroke(accent.color),
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 0.22em',
        backgroundPosition: '0 100%',
        paddingBottom: '0.1em',
        ...clone,
      };
    case 'wave':
    case 'zigzag':
      return {
        backgroundImage: lineTile(accent.style, accent.color),
        backgroundRepeat: 'repeat-x',
        backgroundSize: '0.4em 0.19em',
        backgroundPosition: '0 100%',
        paddingBottom: '0.03em',
        ...clone,
      };
    case 'circle':
      // Padding gives the loop room; the matching negative margin keeps the line from reflowing.
      return {
        backgroundImage: circleStroke(accent.color),
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100%',
        padding: '0.16em 0.26em',
        margin: '0 -0.26em',
        ...clone,
      };
    case 'gradient':
      return paintTextStyle(accent.paint);
    case 'italic-serif':
      return { fontFamily: fontStack('Instrument Serif'), fontStyle: 'italic', color: accent.color, WebkitTextFillColor: accent.color };
  }
}

function TextBlockInner({ element, unit, canvasWidth }: TextBlockProps): ReactElement {
  const fontReady = useFont(element.fontFamily, element.fontWeight);
  const serifReady = useFont('Instrument Serif', 400);
  const lines = parseRichText(element.text);
  const width = element.w * canvasWidth;
  const basePx = element.fontSize * unit;
  const maxLines = element.maxLines ?? (element.role === 'title' ? 2 : 0);
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);

  // Auto-fit: step the size down until the text wraps to at most `maxLines` lines (never below 60%).
  // Runs before paint and again once web fonts arrive, in the editor and in exports alike.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || !maxLines || element.plate.enabled) {
      setFit(1);
      return;
    }
    let scale = 1;
    const linesAt = (s: number) => {
      node.style.fontSize = `${basePx * s}px`;
      // offsetHeight is layout size, unaffected by the canvas zoom transform.
      return node.offsetHeight / (basePx * s * element.lineHeight);
    };
    while (scale > .6 && linesAt(scale) > maxLines + .3) scale = Math.round((scale - .04) * 100) / 100;
    node.style.fontSize = `${basePx * scale}px`;
    setFit(scale);
  }, [element.text, basePx, width, maxLines, element.lineHeight, element.letterSpacing, element.fontFamily, element.fontWeight, element.transform, element.plate.enabled, fontReady, serifReady]);
  const style: CSSProperties = {
    display: 'block',
    width: `${width}px`,
    margin: 0,
    fontFamily: fontStack(element.fontFamily),
    fontWeight: element.fontWeight,
    fontSize: `${basePx * fit}px`,
    lineHeight: element.lineHeight,
    letterSpacing: `${element.letterSpacing}em`,
    textAlign: element.align,
    textTransform: element.transform === 'uppercase' ? 'uppercase' : 'none',
    textWrap: 'balance',
    fontKerning: 'normal',
    WebkitFontSmoothing: 'antialiased',
    ...paintTextStyle(element.fill),
    ...strokeStyle(
      element.stroke.enabled,
      element.stroke.width,
      element.stroke.color,
      element.stroke.opacity,
      unit,
    ),
    textShadow: element.shadow.enabled
      ? `${element.shadow.x * unit}px ${element.shadow.y * unit}px ${element.shadow.blur * unit}px ` +
        `${hexToRgba(element.shadow.color, element.shadow.opacity)}`
      : undefined,
  };
  const plate: CSSProperties = element.plate.enabled
    ? {
        display: 'inline',
        background: paintCss(element.plate.paint),
        borderRadius: `${element.plate.radius * unit}px`,
        padding: `${element.plate.padY * unit}px ${element.plate.padX * unit}px`,
        boxDecorationBreak: 'clone',
        WebkitBoxDecorationBreak: 'clone',
        ...strokeStyle(
          element.plate.stroke.enabled,
          element.plate.stroke.width,
          element.plate.stroke.color,
          element.plate.stroke.opacity,
          unit,
        ),
      }
    : {};

  const accent = accentCss(element.accent);

  return (
    <div ref={ref} style={style}>
      <span style={plate}>
        {lines.map((line, lineIndex) => (
          <span key={lineIndex}>
            {line.map((run, runIndex) => {
              if (!run.accent) return <span key={runIndex}>{run.text}</span>;
              return <span key={runIndex} style={accent}>{run.text}</span>;
            })}
            {lineIndex < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </span>
    </div>
  );
}

export const TextBlock = memo(TextBlockInner);
