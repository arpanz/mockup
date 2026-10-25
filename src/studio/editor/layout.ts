import type { OutputSpec, Project } from '../model/types';

/** All rows render at the same on-screen height at a given zoom: the primary iPhone 6.9″ height. */
export const ROW_REFERENCE_HEIGHT = 2868;
export const CELL_GAP = 40;
export const ROW_GAP = 64;
export const ROW_HEADER = 36;
export const CHIP_ROW = 34;

export const cellScale = (output: OutputSpec, zoom: number) => (zoom * ROW_REFERENCE_HEIGHT) / output.height;

export interface CellRect {
  slideId: string;
  outputId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export interface WorldLayout {
  cells: CellRect[];
  rows: Array<{ outputId: string; y: number; width: number }>;
  width: number;
  height: number;
}

/** World-space layout (screen px at the given zoom, before pan) of every slide × output cell. */
export function computeLayout(project: Project, zoom: number, outputs: OutputSpec[] = project.outputs): WorldLayout {
  const cells: CellRect[] = [];
  const rows: WorldLayout['rows'] = [];
  let y = 0;
  let maxWidth = 0;
  for (const output of outputs) {
    const scale = cellScale(output, zoom);
    const width = output.width * scale;
    const height = output.height * scale;
    const top = y + ROW_HEADER + CHIP_ROW;
    let x = 0;
    for (const slide of project.slides) {
      cells.push({ slideId: slide.id, outputId: output.id, x, y: top, width, height, scale });
      x += width + CELL_GAP;
    }
    const rowWidth = Math.max(0, x - CELL_GAP);
    rows.push({ outputId: output.id, y, width: rowWidth });
    maxWidth = Math.max(maxWidth, rowWidth);
    y = top + height + ROW_GAP;
  }
  return { cells, rows, width: maxWidth, height: Math.max(0, y - ROW_GAP) };
}
