import { useLayoutEffect, useState, type RefObject } from 'react';
import type { StudioElement } from '../model/types';
import { handlesFor, type Guide, type Handle } from './transforms';

export interface MeasuredBox {
  w: number;
  h: number;
}

/** Measure the unrotated layout size (canvas px) of rendered elements inside a cell. */
export function measureElement(root: HTMLElement | null, id: string): MeasuredBox | null {
  const node = root?.querySelector<HTMLElement>(`[data-element-id="${CSS.escape(id)}"]`);
  if (!node) return null;
  return { w: node.offsetWidth, h: node.offsetHeight };
}

const HANDLE_CURSOR: Record<Handle, string> = {
  nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
};

const ACCENT = '#6366F1';

interface SelectionOverlayProps {
  rootRef: RefObject<HTMLDivElement | null>;
  width: number;
  height: number;
  /** Display px per canvas px — used to keep strokes and handles a constant on-screen size. */
  scale: number;
  selected: StudioElement[];
  hovered: StudioElement | null;
  guides: Guide[];
  showHandles: boolean;
}

export function SelectionOverlay({ rootRef, width, height, scale, selected, hovered, guides, showHandles }: SelectionOverlayProps) {
  const [sizes, setSizes] = useState<Record<string, MeasuredBox>>({});
  const ids = [...selected.map((element) => element.id), hovered?.id].filter(Boolean) as string[];

  // Re-measure after every render: text reflows and devices resize as properties change.
  useLayoutEffect(() => {
    const next: Record<string, MeasuredBox> = {};
    let changed = false;
    for (const id of ids) {
      const box = measureElement(rootRef.current, id);
      if (!box) continue;
      next[id] = box;
      const previous = sizes[id];
      if (!previous || Math.abs(previous.w - box.w) > 0.5 || Math.abs(previous.h - box.h) > 0.5) changed = true;
    }
    if (changed || Object.keys(next).length !== Object.keys(sizes).length) setSizes(next);
  });

  const px = (value: number) => value / scale;
  const stroke = px(1.5);
  const handleSize = px(9);

  const frame = (element: StudioElement, kind: 'selected' | 'hover') => {
    const box = sizes[element.id];
    if (!box) return null;
    const cx = element.x * width;
    const cy = element.y * height;
    const single = selected.length === 1 && kind === 'selected';
    const interactive = single && showHandles && !element.locked;
    return (
      <div
        key={`${kind}-${element.id}`}
        style={{
          position: 'absolute',
          left: cx - box.w / 2,
          top: cy - box.h / 2,
          width: box.w,
          height: box.h,
          transform: `rotate(${element.rotation}deg)`,
          outline: `${kind === 'hover' ? px(1) : stroke}px solid ${ACCENT}`,
          outlineOffset: 0,
          pointerEvents: 'none',
        }}
      >
        {interactive && handlesFor(element).map((handle) => {
          const [hx, hy] = { nw: [0, 0], n: [0.5, 0], ne: [1, 0], e: [1, 0.5], se: [1, 1], s: [0.5, 1], sw: [0, 1], w: [0, 0.5] }[handle];
          const side = handle.length === 1;
          return (
            <div
              key={handle}
              data-handle={handle}
              style={{
                position: 'absolute',
                left: hx * box.w - (side ? (hy === 0.5 ? handleSize * 0.35 : handleSize * 1.1) : handleSize) / 2,
                top: hy * box.h - (side ? (hx === 0.5 ? handleSize * 0.35 : handleSize * 1.1) : handleSize) / 2,
                width: side ? (hy === 0.5 ? handleSize * 0.35 : handleSize * 1.1) : handleSize,
                height: side ? (hx === 0.5 ? handleSize * 0.35 : handleSize * 1.1) : handleSize,
                background: '#FFFFFF',
                border: `${stroke}px solid ${ACCENT}`,
                borderRadius: side ? px(3) : px(2.5),
                boxShadow: `0 ${px(1)}px ${px(3)}px rgba(15, 23, 42, 0.25)`,
                cursor: HANDLE_CURSOR[handle],
                pointerEvents: 'auto',
                // Larger invisible hit area without changing the drawn size.
                outline: `${px(6)}px solid transparent`,
              }}
            />
          );
        })}
        {interactive && (
          <>
            <div style={{ position: 'absolute', left: box.w / 2 - px(0.75), top: -px(26), width: px(1.5), height: px(18), background: ACCENT }} />
            <div
              data-rotate="true"
              title="Rotate (Shift snaps 15°)"
              style={{
                position: 'absolute',
                left: box.w / 2 - px(6),
                top: -px(34),
                width: px(12),
                height: px(12),
                borderRadius: '50%',
                background: '#FFFFFF',
                border: `${stroke}px solid ${ACCENT}`,
                cursor: 'grab',
                pointerEvents: 'auto',
                outline: `${px(6)}px solid transparent`,
              }}
            />
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
      {hovered && !selected.some((element) => element.id === hovered.id) && frame(hovered, 'hover')}
      {selected.map((element) => frame(element, 'selected'))}
      {guides.map((guide, index) => (
        <div
          key={index}
          style={guide.axis === 'x'
            ? { position: 'absolute', left: guide.at - px(0.5), top: 0, width: px(1), height, background: '#F43F5E' }
            : { position: 'absolute', top: guide.at - px(0.5), left: 0, height: px(1), width, background: '#F43F5E' }}
        />
      ))}
    </div>
  );
}
