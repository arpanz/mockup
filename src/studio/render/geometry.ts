import { frameModel, resolveDeviceModel } from '../devices/catalog';
import { deviceBoxSize } from '../devices/DeviceFrame';
import type { OutputSpec, StudioElement } from '../model/types';
import { baseUnit } from '../model/units';

/**
 * Element layout box in canvas px (unrotated). Text height is content-driven, so callers that need
 * it measure the DOM; here it is estimated from line count for span/overflow decisions only.
 */
export function elementBox(element: StudioElement, output: OutputSpec): { width: number; height: number } {
  const W = output.width;
  const H = output.height;
  const unit = baseUnit(W, H);
  switch (element.type) {
    case 'text': {
      const lines = Math.max(1, element.text.split('\n').length);
      return { width: element.w * W, height: lines * element.fontSize * element.lineHeight * unit };
    }
    case 'device': {
      const model = frameModel(resolveDeviceModel(element.model, output.family), element);
      return deviceBoxSize(model, element.orientation, element.h * H);
    }
    case 'image':
    case 'shape':
      return { width: element.w * unit, height: element.h * unit };
  }
}

/** Horizontal extent as fractions of W: [left, right]. */
export function horizontalExtent(element: StudioElement, output: OutputSpec): [number, number] {
  const { width } = elementBox(element, output);
  const half = width / output.width / 2;
  return [element.x - half, element.x + half];
}
