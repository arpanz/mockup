import type { StudioElement } from '../model/types';

export interface Box {
  /** Center and size in canvas px (unrotated). */
  cx: number;
  cy: number;
  w: number;
  h: number;
}

export interface Guide {
  axis: 'x' | 'y';
  /** Canvas px position of the line. */
  at: number;
}

export interface SnapResult {
  dx: number;
  dy: number;
  guides: Guide[];
}

/**
 * Snap a moving box (already offset by the raw drag delta) to the canvas center, safe margins and
 * other elements' centers/edges. Returns the corrected delta and the guides to draw.
 */
export function snapMove(moving: Box, others: Box[], canvas: { w: number; h: number }, threshold: number): SnapResult {
  const xs: number[] = [canvas.w / 2, canvas.w * 0.06, canvas.w * 0.94];
  const ys: number[] = [canvas.h / 2, canvas.h * 0.04, canvas.h * 0.96];
  for (const other of others) {
    xs.push(other.cx, other.cx - other.w / 2, other.cx + other.w / 2);
    ys.push(other.cy, other.cy - other.h / 2, other.cy + other.h / 2);
  }
  const movingXs = [moving.cx, moving.cx - moving.w / 2, moving.cx + moving.w / 2];
  const movingYs = [moving.cy, moving.cy - moving.h / 2, moving.cy + moving.h / 2];

  const best = (candidates: number[], targets: number[]) => {
    let result: { delta: number; at: number } | null = null;
    for (const value of candidates) {
      for (const target of targets) {
        const delta = target - value;
        if (Math.abs(delta) <= threshold && (!result || Math.abs(delta) < Math.abs(result.delta))) result = { delta, at: target };
      }
    }
    return result;
  };

  const bx = best(movingXs, xs);
  const by = best(movingYs, ys);
  const guides: Guide[] = [];
  if (bx) guides.push({ axis: 'x', at: bx.at });
  if (by) guides.push({ axis: 'y', at: by.at });
  return { dx: bx?.delta ?? 0, dy: by?.delta ?? 0, guides };
}

export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const HANDLE_VECTORS: Record<Handle, [number, number]> = {
  nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0], se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0],
};

/** Which handles make sense for an element (side handles only resize one dimension). */
export function handlesFor(element: StudioElement): Handle[] {
  const corners: Handle[] = ['nw', 'ne', 'se', 'sw'];
  if (element.rotation % 360 !== 0) return corners;
  if (element.type === 'text') return [...corners, 'e', 'w'];
  if (element.type === 'image' || element.type === 'shape') return [...corners, 'n', 'e', 's', 'w'];
  return corners;
}

/**
 * Resize from a handle. `fromCenter` scales symmetrically (Alt). Rotated elements always scale about
 * their center. Returns the uniform scale factor (corners) or new size along one axis (sides) and the
 * new center, all in canvas px.
 */
export function resizeBox(start: Box, handle: Handle, pointer: { x: number; y: number }, fromCenter: boolean, rotated: boolean) {
  const [hx, hy] = HANDLE_VECTORS[handle];
  const symmetric = fromCenter || rotated;
  const anchor = symmetric
    ? { x: start.cx, y: start.cy }
    : { x: start.cx - (hx * start.w) / 2, y: start.cy - (hy * start.h) / 2 };
  const span = symmetric ? 0.5 : 1;

  if (hx !== 0 && hy !== 0) {
    const v = { x: hx * start.w * span, y: hy * start.h * span };
    const p = { x: pointer.x - anchor.x, y: pointer.y - anchor.y };
    const scale = Math.max(0.05, (p.x * v.x + p.y * v.y) / (v.x * v.x + v.y * v.y));
    const center = symmetric ? anchor : { x: anchor.x + (v.x * scale) / 2, y: anchor.y + (v.y * scale) / 2 };
    return { kind: 'uniform' as const, scale, center };
  }
  if (hx !== 0) {
    const width = Math.max(8, (Math.abs(pointer.x - anchor.x) / span));
    const center = symmetric ? anchor : { x: anchor.x + (hx * width) / 2, y: start.cy };
    return { kind: 'width' as const, size: width, center };
  }
  const height = Math.max(8, Math.abs(pointer.y - anchor.y) / span);
  const center = symmetric ? anchor : { x: start.cx, y: anchor.y + (hy * height) / 2 };
  return { kind: 'height' as const, size: height, center };
}

export function snapAngle(degrees: number, coarse: boolean): number {
  const normalized = ((degrees % 360) + 360) % 360;
  if (coarse) return Math.round(normalized / 15) * 15 % 360;
  for (const target of [0, 90, 180, 270, 360]) {
    if (Math.abs(normalized - target) < 2) return target % 360;
  }
  return Math.round(normalized * 10) / 10;
}
