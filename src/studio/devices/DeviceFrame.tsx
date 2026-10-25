import { memo, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import type { DeviceElement } from '../model/types';
import { hexToRgba } from '../model/units';
import type { DeviceFinish, DeviceModel } from './catalog';

export interface DeviceFrameProps {
  element: DeviceElement;
  model: DeviceModel;
  width: number;
  height: number;
  unit: number;
  screenSrc: string | null;
  /** Editor only: show an "add screenshot" call to action on empty screens. Never in exports. */
  showDropHint?: boolean;
}

export function deviceBoxSize(
  model: DeviceModel,
  orientation: 'portrait' | 'landscape',
  heightPx: number,
): { width: number; height: number } {
  const rotate = orientation === 'landscape' && model.kind !== 'laptop' && model.kind !== 'browser';
  return rotate
    ? { width: heightPx, height: heightPx * model.aspect }
    : { width: heightPx * model.aspect, height: heightPx };
}

/** Darken a hex color toward black by `amount` (0..1). */
function mixDark(hex: string, amount = .2): string {
  return mixToward(hex, [0, 0, 0], amount);
}

function mixLight(hex: string, amount = .2): string {
  return mixToward(hex, [255, 255, 255], amount);
}

function mixToward(hex: string, target: [number, number, number], amount: number): string {
  const raw = hex.replace('#', '');
  if (!/^[\da-f]{6}/i.test(raw)) return hex;
  const channel = (index: number) => {
    const value = parseInt(raw.slice(index * 2, index * 2 + 2), 16);
    return Math.round(value + (target[index] - value) * amount);
  };
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

const luminance = (hex: string) => {
  const raw = hex.replace('#', '');
  if (!/^[\da-f]{6}/i.test(raw)) return .5;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(raw.slice(i, i + 2), 16) / 255);
  return .2126 * r + .7152 * g + .0722 * b;
};

/** Styles that draw a solid body (and therefore get a 3D edge when tilted). */
const SOLID_STYLES = new Set(['real', 'matte', 'clay', 'minimal']);
/** Styles that are pure "screen in a border" and skip cutouts/buttons for a clean, modern look. */
const FLAT_STYLES = new Set(['minimal', 'glass', 'outline', 'none']);

interface Geometry {
  frameWidth: number;
  frameHeight: number;
  radius: number;
  screen: { x: number; y: number; w: number; h: number; r: number };
}

function geometry(element: DeviceElement, model: DeviceModel, frameWidth: number, frameHeight: number): Geometry {
  const radius = model.bodyRadius * frameWidth;
  const style = element.style;
  if (FLAT_STYLES.has(style) && (model.kind === 'phone' || model.kind === 'tablet')) {
    // Even border all the way round, sized like the references (WhatsApp / Notion / Uber Eats).
    const border = style === 'none' ? 0 : frameWidth * (style === 'glass' ? (model.kind === 'phone' ? .042 : .028) : style === 'outline' ? .03 : (model.kind === 'phone' ? .026 : .018));
    return {
      frameWidth, frameHeight, radius,
      screen: { x: border, y: border, w: frameWidth - border * 2, h: frameHeight - border * 2, r: Math.max(0, radius - border * (style === 'none' ? 0 : .9)) },
    };
  }
  return {
    frameWidth, frameHeight, radius,
    screen: {
      x: model.screen.left * frameWidth,
      y: model.screen.top * frameHeight,
      w: model.screen.width * frameWidth,
      h: model.screen.height * frameHeight,
      r: model.screen.radius * frameWidth,
    },
  };
}

function ScreenContent({ element, model, screenSrc, showDropHint, flat }: { element: DeviceElement; model: DeviceModel; screenSrc: string | null; showDropHint: boolean; flat: boolean }): ReactElement {
  return (
    <>
      {screenSrc
        ? <img src={screenSrc} alt="" draggable={false} style={{ width: '100%', height: '100%', display: 'block', objectFit: element.screen.fit, objectPosition: `center ${element.screen.position}` }} />
        : <Placeholder hint={showDropHint} />}
      {element.glare > 0 && (
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `linear-gradient(122deg, rgba(255,255,255,${element.glare * .28}) 0%, ` +
              `rgba(255,255,255,${element.glare * .07}) 32%, transparent 52%)`,
          }}
        />
      )}
      {!flat && model.cutout === 'dynamic-island' && (
        <div style={{ position: 'absolute', left: '50%', top: '1.15%', width: '28.6%', height: '3.85%', transform: 'translateX(-50%)', borderRadius: 999, background: '#000' }}>
          <i style={{ position: 'absolute', right: '11%', top: '50%', height: '42%', aspectRatio: '1', transform: 'translateY(-50%)', borderRadius: '50%', background: 'radial-gradient(circle at 38% 32%, #2b3644, #07090c 62%)' }} />
        </div>
      )}
      {!flat && model.cutout === 'punch-hole' && (
        <div style={{ position: 'absolute', left: '50%', top: '1.3%', width: '3.2%', aspectRatio: '1', transform: 'translateX(-50%)', borderRadius: '50%', background: '#050506', boxShadow: '0 0 0 1px rgba(255,255,255,.08)' }} />
      )}
      {!flat && model.cutout === 'notch' && (
        <div style={{ position: 'absolute', left: '50%', top: 0, width: '11%', height: '3.4%', transform: 'translateX(-50%)', borderRadius: '0 0 18% 18% / 0 0 40% 40%', background: '#050506' }} />
      )}
    </>
  );
}

/** Colors for one frame style. */
function palette(element: DeviceElement, finish: DeviceFinish) {
  const tint = element.tint;
  switch (element.style) {
    case 'real': return { body: finish.body, edgeFront: finish.edge, edgeBack: finish.shadow, button: finish.edge };
    case 'matte': return { body: tint, edgeFront: mixDark(tint, .12), edgeBack: mixDark(tint, .45), button: mixDark(tint, .08) };
    case 'clay': return { body: tint, edgeFront: mixDark(tint, .1), edgeBack: mixDark(tint, .32), button: mixDark(tint, .06) };
    case 'minimal': return { body: tint, edgeFront: luminance(tint) < .2 ? mixLight(tint, .14) : mixDark(tint, .14), edgeBack: mixDark(tint, .4), button: tint };
    default: return { body: tint, edgeFront: tint, edgeBack: tint, button: tint };
  }
}

function frontBackground(element: DeviceElement, finish: DeviceFinish): string {
  const tint = element.style === 'real' ? finish.body : element.tint;
  switch (element.style) {
    case 'real':
      // Polished band: bright specular rims, body tone across the flat.
      return `linear-gradient(90deg, ${finish.shadow} 0%, ${finish.highlight} 1.1%, ${finish.edge} 2.4%, ${finish.body} 5.5%, ` +
        `${finish.body} 94.5%, ${finish.edge} 97.6%, ${finish.highlight} 98.9%, ${finish.shadow} 100%), ` +
        `linear-gradient(180deg, ${finish.highlight} 0%, ${finish.body} 3%, ${finish.body} 97%, ${finish.shadow} 100%)`;
    case 'matte':
      return `linear-gradient(160deg, ${mixLight(tint, .1)} 0%, ${tint} 30%, ${tint} 70%, ${mixDark(tint, .12)} 100%)`;
    case 'clay':
      return `radial-gradient(120% 70% at 25% 8%, ${mixLight(tint, .35)} 0%, ${tint} 45%, ${mixDark(tint, .1)} 100%)`;
    case 'minimal':
      return tint;
    case 'glass':
      return `linear-gradient(160deg, ${hexToRgba(tint, .55)} 0%, ${hexToRgba(tint, .28)} 45%, ${hexToRgba(tint, .4)} 100%)`;
    default:
      return 'transparent';
  }
}

function frontShadow(element: DeviceElement, frameWidth: number): string | undefined {
  const hair = Math.max(.5, frameWidth * .0011);
  switch (element.style) {
    case 'real': return `0 0 0 ${hair}px rgba(0,0,0,.42), inset 0 0 0 ${hair}px rgba(255,255,255,.38)`;
    case 'matte': return `0 0 0 ${hair}px rgba(0,0,0,.35), inset 0 0 0 ${hair}px rgba(255,255,255,.12)`;
    case 'clay': return `inset ${frameWidth * .012}px ${frameWidth * .014}px ${frameWidth * .03}px rgba(255,255,255,.45), inset ${-frameWidth * .012}px ${-frameWidth * .016}px ${frameWidth * .035}px rgba(0,0,0,.16), 0 0 0 ${hair}px rgba(0,0,0,.08)`;
    case 'minimal': return luminance(element.tint) < .2 ? `inset 0 0 0 ${hair}px rgba(255,255,255,.1)` : `0 0 0 ${hair}px rgba(0,0,0,.1)`;
    case 'glass': return `inset 0 0 0 ${hair * 1.5}px rgba(255,255,255,.75), 0 0 0 ${hair}px rgba(15,23,42,.08), inset 0 ${frameWidth * .01}px ${frameWidth * .03}px rgba(255,255,255,.35)`;
    default: return undefined;
  }
}

/** Stacked slices behind the front face give the body a real side wall when it's tilted in 3D. */
function DepthSlices({ depth, radius, front, back, count }: { depth: number; radius: number; front: string; back: string; count: number }): ReactElement {
  const slices: ReactNode[] = [];
  for (let i = 1; i <= count; i += 1) {
    const t = i / count;
    slices.push(
      <div
        key={i}
        style={{
          position: 'absolute', inset: 0, borderRadius: radius,
          // Fade from the front edge tone to the back tone so the side wall reads as a rounded surface.
          background: `color-mix(in srgb, ${front} ${Math.round((1 - t) * 100)}%, ${back})`,
          transform: `translateZ(${-depth * t}px)`,
        }}
      />,
    );
  }
  return <>{slices}</>;
}

function DeviceFrameView({ element, model, width, height, unit, screenSrc, showDropHint = false }: DeviceFrameProps): ReactElement {
  const finish = model.finishes.find((option) => option.id === element.finish) ?? model.finishes[0];
  const rotated = element.orientation === 'landscape' && model.kind !== 'laptop' && model.kind !== 'browser';
  const frameWidth = rotated ? height : width;
  const frameHeight = rotated ? width : height;
  const style = element.style;
  const tilted = Math.abs(element.tiltX) > .5 || Math.abs(element.tiltY) > .5;

  const shadow = element.shadow.enabled
    ? `drop-shadow(${(element.shadow.x + element.tiltY * .35) * unit}px ${(element.shadow.y + Math.abs(element.tiltX) * .4) * unit}px ` +
      `${Math.max(0, element.shadow.blur * unit)}px ${hexToRgba(element.shadow.color, element.shadow.opacity)})`
    : undefined;

  const wrapper: CSSProperties = { position: 'relative', width, height, filter: shadow, perspective: tilted ? element.perspective * unit : undefined };
  const rig: CSSProperties = {
    position: 'absolute', inset: 0, transformStyle: 'preserve-3d',
    transform: tilted ? `rotateX(${element.tiltX}deg) rotateY(${element.tiltY}deg)` : undefined,
  };

  if (model.kind === 'laptop') {
    return (
      <div style={wrapper}>
        <div style={rig}>
          <LaptopFrame element={element} model={model} finish={finish} width={width} height={height} screenSrc={screenSrc} showDropHint={showDropHint} />
        </div>
      </div>
    );
  }

  const geo = geometry(element, model, frameWidth, frameHeight);
  const colors = palette(element, finish);
  const flat = FLAT_STYLES.has(style);
  const browser = model.kind === 'browser';
  const solid = SOLID_STYLES.has(style) && !browser;
  const depth = frameWidth * (model.kind === 'phone' ? .075 : .04);
  const sliceCount = Math.max(8, Math.min(28, Math.round(depth / Math.max(.75, frameWidth * .003))));
  const band = !solid || style === 'minimal' ? 0 : frameWidth * (model.kind === 'phone' ? .0135 : .0085);
  const hair = Math.max(.5, frameWidth * .0011);

  const body: CSSProperties = {
    position: 'absolute', width: frameWidth, height: frameHeight, left: '50%', top: '50%',
    transform: `translate(-50%, -50%)${rotated ? ' rotate(90deg)' : ''}`,
    transformStyle: 'preserve-3d',
  };
  const front: CSSProperties = {
    position: 'absolute', inset: 0, borderRadius: geo.radius, containerType: 'inline-size',
    background: browser ? '#FFFFFF' : frontBackground(element, finish),
    boxShadow: browser ? `0 0 0 ${hair}px rgba(0,0,0,.12)` : frontShadow(element, frameWidth),
    border: style === 'outline' ? `${Math.max(1, frameWidth * .008)}px solid ${element.tint}` : undefined,
    boxSizing: 'border-box',
  };
  const screen: CSSProperties = {
    position: 'absolute', left: geo.screen.x, top: geo.screen.y, width: geo.screen.w, height: geo.screen.h,
    borderRadius: geo.screen.r, overflow: 'hidden', background: element.screen.background,
    boxShadow: style === 'glass' ? `0 0 0 ${hair}px rgba(255,255,255,.6)` : undefined,
  };
  // Outline draws its stroke with a border, so its children are offset by it; compensate.
  if (style === 'outline') {
    const stroke = Math.max(1, frameWidth * .008);
    screen.left = geo.screen.x - stroke;
    screen.top = geo.screen.y - stroke;
  }

  const showButtons = element.showButtons && solid && style !== 'minimal';
  const buttonThick = frameWidth * (model.kind === 'phone' ? .0075 : .005);

  return (
    <div style={wrapper}>
      <div style={rig}>
        <div style={body}>
          {solid && tilted && <DepthSlices depth={depth} radius={geo.radius} front={colors.edgeFront} back={colors.edgeBack} count={sliceCount} />}
          {showButtons && model.buttons.map((button, index) => {
            const vertical = button.side !== 'top';
            const shape: CSSProperties = vertical
              ? { [button.side]: -buttonThick + hair, top: `${button.offset * 100}%`, width: buttonThick, height: button.length * frameHeight, borderRadius: button.side === 'left' ? `${buttonThick}px 0 0 ${buttonThick}px` : `0 ${buttonThick}px ${buttonThick}px 0` }
              : { left: `${button.offset * 100}%`, top: -buttonThick + hair, width: button.length * frameWidth, height: buttonThick, borderRadius: `${buttonThick}px ${buttonThick}px 0 0` };
            return (
              <span
                key={`${button.side}-${index}`}
                style={{
                  position: 'absolute', ...shape,
                  background: style === 'real'
                    ? `linear-gradient(${button.side === 'left' ? 90 : button.side === 'right' ? 270 : 180}deg, ${finish.shadow}, ${finish.edge} 55%, ${finish.body})`
                    : colors.button,
                  boxShadow: style === 'real' ? `0 0 0 ${hair}px rgba(0,0,0,.3)` : undefined,
                  // Sit the buttons halfway down the side wall when there is one.
                  transform: tilted ? `translateZ(${-depth * .45}px)` : undefined,
                }}
              />
            );
          })}
          <div style={front}>
            {band > 0 && (
              <div
                style={{
                  position: 'absolute', inset: band, borderRadius: Math.max(0, geo.radius - band),
                  background: style === 'clay' ? mixDark(element.tint, .06) : '#030304',
                  boxShadow: style === 'clay' ? 'inset 0 1px 2px rgba(255,255,255,.25)' : `inset 0 0 0 ${hair}px rgba(255,255,255,.07)`,
                }}
              />
            )}
            {browser && <BrowserChrome width={frameWidth} />}
            <div style={screen}>
              <ScreenContent element={element} model={model} screenSrc={screenSrc} showDropHint={showDropHint} flat={flat} />
            </div>
            {!flat && model.cutout === 'home-button' && (
              <div
                style={{
                  position: 'absolute', left: '50%', width: '13%', aspectRatio: '1', borderRadius: '50%',
                  top: `${(model.screen.top + model.screen.height + (1 - model.screen.top - model.screen.height) / 2) * 100}%`,
                  transform: 'translate(-50%, -50%)', background: style === 'real' ? '#0b0b0c' : mixDark(element.tint, .08),
                  boxShadow: `inset 0 0 0 ${frameWidth * .006}px ${style === 'real' ? finish.edge : mixDark(element.tint, .2)}`,
                }}
              />
            )}
            {!flat && model.cutout === 'home-button' && (
              <div style={{ position: 'absolute', left: '50%', top: `${model.screen.top * 50}%`, width: '16%', height: frameWidth * .012, transform: 'translate(-50%, -50%)', borderRadius: 999, background: '#1a1a1c' }} />
            )}
            {style === 'real' && band > 0 && (model.family === 'iphone' || model.family === 'android-phone') && (['left', 'right'] as const).flatMap((side) => ['7.5%', '92.5%'].map((top) => (
              <span key={`${side}-${top}`} style={{ position: 'absolute', [side]: 0, top, width: band, height: frameWidth * .009, background: hexToRgba(finish.shadow, .55) }} />
            )))}
            {model.kind === 'tablet' && rotated && !flat && (
              <span style={{ position: 'absolute', left: '50%', top: geo.screen.y / 2, width: frameWidth * .007, aspectRatio: '1', transform: 'translate(-50%, -50%)', borderRadius: '50%', background: '#111214', boxShadow: '0 0 0 1px rgba(255,255,255,.22)' }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** MacBook: lid (black glass in an aluminum rim) resting on a thin, wider base. Geometry matches the catalog model. */
function LaptopFrame({ element, model, finish, width, height, screenSrc, showDropHint }: {
  element: DeviceElement; model: DeviceModel; finish: DeviceFinish; width: number; height: number; screenSrc: string | null; showDropHint: boolean;
}): ReactElement {
  const style = element.style;
  const real = style === 'real';
  const metal = real ? finish.body : element.tint;
  const lidLeft = width * .037;
  const lidWidth = width * .926;
  const lidHeight = height * .948;
  const baseHeight = height - lidHeight;
  const rim = Math.max(1, width * .0035);
  const flat = FLAT_STYLES.has(style);
  const lid: CSSProperties = {
    position: 'absolute', left: lidLeft, top: 0, width: lidWidth, height: lidHeight,
    borderRadius: `${width * model.bodyRadius}px ${width * model.bodyRadius}px ${width * .006}px ${width * .006}px`,
    background: style === 'outline' || style === 'none' ? 'transparent' : style === 'glass' ? hexToRgba(element.tint, .4) : flat ? element.tint : '#060607',
    boxShadow: style === 'outline' ? `inset 0 0 0 ${Math.max(1, width * .004)}px ${element.tint}` : flat ? undefined : `0 0 0 ${rim}px ${real ? finish.edge : metal}, 0 0 0 ${rim * 1.6}px rgba(0,0,0,.25)`,
    containerType: 'inline-size',
  };
  const screen: CSSProperties = {
    position: 'absolute', left: model.screen.left * width - lidLeft, top: model.screen.top * height,
    width: model.screen.width * width, height: model.screen.height * height,
    borderRadius: model.screen.radius * width, overflow: 'hidden', background: element.screen.background,
  };
  return (
    <>
      <div style={lid}>
        <div style={screen}>
          <ScreenContent element={element} model={model} screenSrc={screenSrc} showDropHint={showDropHint} flat={flat} />
        </div>
      </div>
      {style !== 'none' && (
        <div
          style={{
            position: 'absolute', left: 0, top: lidHeight - baseHeight * .1, width, height: baseHeight * 1.1,
            borderRadius: `${baseHeight * .25}px ${baseHeight * .25}px ${baseHeight * .9}px ${baseHeight * .9}px / ${baseHeight * .25}px ${baseHeight * .25}px ${baseHeight * .6}px ${baseHeight * .6}px`,
            background: style === 'outline' ? 'transparent' : style === 'glass'
              ? hexToRgba(element.tint, .5)
              : real
                ? `linear-gradient(180deg, ${finish.highlight} 0%, ${finish.edge} 18%, ${finish.body} 45%, ${finish.shadow} 100%)`
                : `linear-gradient(180deg, ${mixLight(metal, .25)} 0%, ${metal} 40%, ${mixDark(metal, .3)} 100%)`,
            border: style === 'outline' ? `${Math.max(1, width * .004)}px solid ${element.tint}` : undefined,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ position: 'absolute', left: '43%', width: '14%', top: 0, height: '38%', borderRadius: `0 0 ${baseHeight * .3}px ${baseHeight * .3}px`, background: real ? finish.shadow : mixDark(metal, .2), opacity: .55 }} />
        </div>
      )}
    </>
  );
}

function Placeholder({ hint }: { hint: boolean }): ReactElement {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: 'linear-gradient(160deg,#F4F4F5,#E4E4E7)', containerType: 'inline-size' }}>
      <div style={{ position: 'absolute', left: '8%', right: '8%', top: '7%', height: '3%', borderRadius: 999, background: '#DCDCE0' }} />
      <div style={{ position: 'absolute', left: '8%', right: '8%', top: '14%', height: '22%', borderRadius: '6cqw', background: '#D9D9DE' }} />
      <div style={{ position: 'absolute', left: '8%', right: '8%', top: '40%', height: '12%', borderRadius: '6cqw', background: '#FAFAFA' }} />
      <div style={{ position: 'absolute', left: '8%', right: '8%', top: '56%', height: '12%', borderRadius: '6cqw', background: '#FAFAFA' }} />
      {hint && (
        <div style={{ position: 'absolute', inset: '6%', border: '0.9cqw dashed rgba(99,102,241,.55)', borderRadius: '9cqw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3cqw', background: 'rgba(238,242,255,.72)', color: '#4F46E5', textAlign: 'center' }}>
          <svg viewBox="0 0 24 24" width="18%" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
          </svg>
          <div style={{ font: '600 6.5cqw/1.2 Inter, system-ui, sans-serif' }}>Drop screenshot</div>
          <div style={{ font: '500 4.6cqw/1.3 Inter, system-ui, sans-serif', opacity: .7 }}>or double-click to upload</div>
        </div>
      )}
    </div>
  );
}

function BrowserChrome({ width }: { width: number }): ReactElement {
  return (
    <div
      style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: width * .095,
        background: 'linear-gradient(#FAFAFA,#E4E4E7)',
        borderRadius: `${width * .035}px ${width * .035}px 0 0`,
        borderBottom: '1px solid rgba(0,0,0,.16)',
      }}
    >
      <div style={{ position: 'absolute', left: '3%', top: '34%', display: 'flex', gap: width * .012 }}>
        {['#ff6058', '#ffbd2e', '#28c840'].map((color) => (
          <i key={color} style={{ width: width * .018, aspectRatio: '1', borderRadius: '50%', background: color, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.12)' }} />
        ))}
      </div>
      <div style={{ position: 'absolute', left: '22%', right: '22%', top: '20%', height: '60%', borderRadius: 999, background: 'rgba(255,255,255,.85)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.12)' }} />
    </div>
  );
}

export const DeviceFrame = memo(DeviceFrameView);
