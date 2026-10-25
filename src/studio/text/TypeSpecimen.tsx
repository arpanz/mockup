import type { ReactElement } from 'react';
import { createText } from '../model/defaults';
import type { TextElement } from '../model/types';
import { TextBlock } from './TextBlock';

function specimen(patch: Partial<TextElement>): TextElement {
  return createText('title', {
    text: 'Make every moment *matter*',
    fontSize: 34,
    lineHeight: 1.12,
    w: 1,
    ...patch,
  });
}

const baseAccent = specimen({}).accent;
const basePlate = specimen({}).plate;

const examples: Array<{ label: string; element: TextElement }> = [
  { label: 'Color accent', element: specimen({ accent: { ...baseAccent, style: 'color' } }) },
  { label: 'Marker highlight', element: specimen({ accent: { ...baseAccent, style: 'highlight' } }) },
  { label: 'Hand-drawn underline', element: specimen({ accent: { ...baseAccent, style: 'underline' } }) },
  { label: 'Gradient accent', element: specimen({ accent: { ...baseAccent, style: 'gradient' } }) },
  { label: 'Editorial italic', element: specimen({ accent: { ...baseAccent, style: 'italic-serif' } }) },
  {
    label: 'Badge plate',
    element: specimen({
      text: 'A little *something extra*',
      plate: {
        ...basePlate,
        enabled: true,
        paint: { kind: 'solid', color: '#312E81' },
        radius: 18,
        padX: 14,
        padY: 8,
      },
    }),
  },
  {
    label: 'Outline + shadow',
    element: specimen({
      stroke: { enabled: true, width: 1.2, color: '#FFFFFF', opacity: 0.9 },
      shadow: { enabled: true, x: 0, y: 3, blur: 8, spread: 0, color: '#000000', opacity: 0.28 },
    }),
  },
  {
    label: 'Gradient fill',
    element: specimen({
      fill: {
        kind: 'linear',
        angle: 0,
        stops: [
          { color: '#4F46E5', position: 0 },
          { color: '#EC4899', position: 1 },
        ],
      },
    }),
  },
  ...['Inter', 'Space Grotesk', 'Playfair Display', 'Fredoka', 'Bebas Neue', 'Instrument Serif'].map(
    (family) => ({
      label: family,
      element: specimen({
        text: 'Beautifully *made* for you',
        fontFamily: family,
        fontWeight: family === 'Instrument Serif' ? 400 : 700,
      }),
    }),
  ),
  {
    label: 'Balanced multiline',
    element: specimen({ text: 'A smarter way to\n*find your flow*', w: 0.82, fontSize: 39 }),
  },
];

export function TypeSpecimen(): ReactElement {
  return (
    <div
      style={{
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: 1160,
        margin: '0 auto',
        padding: 30,
        background: '#fff',
        color: '#101828',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
        gap: 24,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {examples.map(({ label, element }) => (
        <div
          key={label}
          style={{
            boxSizing: 'border-box',
            minHeight: 150,
            minWidth: 0,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'stretch',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              marginBottom: 16,
              fontSize: 10,
              color: '#6b7280',
              letterSpacing: '.08em',
              textTransform: 'uppercase',
            }}
          >
            {label}
          </div>
          <TextBlock element={element} unit={1} canvasWidth={324} />
        </div>
      ))}
    </div>
  );
}
