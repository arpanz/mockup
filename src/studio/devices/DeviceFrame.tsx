import { memo, type CSSProperties, type ReactElement } from 'react';
import type { DeviceElement } from '../model/types';
import { hexToRgba } from '../model/units';
import type { DeviceModel } from './catalog';

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

function DeviceFrameView({ element, model, width, height, unit, screenSrc, showDropHint = false }: DeviceFrameProps): ReactElement {
  const finish = model.finishes.find((option) => option.id === element.finish) ?? model.finishes[0];
  const rotated = element.orientation === 'landscape' && model.kind !== 'laptop' && model.kind !== 'browser';
  const frameWidth = rotated ? height : width;
  const frameHeight = rotated ? width : height;
  const radius = model.bodyRadius * frameWidth;
  const screenX = model.screen.left * frameWidth;
  const screenY = model.screen.top * frameHeight;
  const screenWidth = model.screen.width * frameWidth;
  const screenHeight = model.screen.height * frameHeight;
  const screenRadius = model.screen.radius * frameWidth;
  const style = element.style;
  const real = style === 'real';
  const clay = style === 'clay';
  const bare = style === 'none';
  const browser = model.kind === 'browser';
  const body = real ? finish.body : element.tint;

  // Physical build, outside → in: metal band, black glass, screen.
  const band = bare || browser ? 0 : frameWidth * (model.kind === 'phone' ? .0135 : model.kind === 'tablet' ? .0085 : .006);
  const hairline = Math.max(.5, frameWidth * .0011);
  const metal = `linear-gradient(90deg, ${finish.shadow} 0%, ${finish.highlight} 1.1%, ${finish.edge} 2.4%, ${finish.body} 5.5%, ` +
    `${finish.body} 94.5%, ${finish.edge} 97.6%, ${finish.highlight} 98.9%, ${finish.shadow} 100%), ` +
    `linear-gradient(180deg, ${finish.highlight} 0%, ${finish.body} 3%, ${finish.body} 97%, ${finish.shadow} 100%)`;
  const frameBackground = bare
    ? 'transparent'
    : browser
      ? '#FFFFFF'
      : style === 'outline'
        ? 'transparent'
        : real
          ? metal
          : clay
            ? `radial-gradient(ellipse at 24% 10%, rgba(255,255,255,.42), transparent 50%), linear-gradient(150deg, ${element.tint} 0%, ${element.tint} 55%, ${mixDark(element.tint)} 100%)`
            : element.tint;
  const frameStyle: CSSProperties = {
    position: 'absolute',
    width: frameWidth,
    height: frameHeight,
    left: '50%',
    top: '50%',
    containerType: 'inline-size',
    transform: `translate(-50%, -50%)${rotated ? ' rotate(90deg)' : ''}`,
    transformOrigin: 'center',
    borderRadius: radius,
    background: frameBackground,
    border: style === 'outline' ? `${Math.max(1, frameWidth * .008)}px solid ${element.tint}` : undefined,
    boxShadow: bare || style === 'outline'
      ? undefined
      : clay
        ? `inset ${-frameWidth * .016}px ${frameWidth * .02}px ${frameWidth * .045}px rgba(0,0,0,.22), ` +
          `inset ${frameWidth * .014}px ${-frameWidth * .016}px ${frameWidth * .04}px rgba(255,255,255,.35)`
        : `0 0 0 ${hairline}px rgba(0,0,0,.42), inset 0 0 0 ${hairline}px rgba(255,255,255,${real ? .38 : .14})`,
    overflow: 'visible',
  };
  // Glass: the black panel inside the band that frames the display.
  const glassStyle: CSSProperties = {
    position: 'absolute',
    inset: band,
    borderRadius: Math.max(0, radius - band),
    background: clay ? mixDark(element.tint, .1) : '#030304',
    boxShadow: clay
      ? 'inset 0 1px 2px rgba(255,255,255,.18)'
      : `inset 0 0 0 ${hairline}px rgba(255,255,255,.07), inset 0 ${hairline * 2}px ${hairline * 3}px rgba(255,255,255,.05)`,
  };
  const screenStyle: CSSProperties = {
    position: 'absolute',
    left: screenX,
    top: screenY,
    width: screenWidth,
    height: screenHeight,
    borderRadius: screenRadius,
    overflow: 'hidden',
    background: element.screen.background,
  };
  const frameShadow = element.shadow.enabled
    ? `drop-shadow(${(element.shadow.x + element.tiltY * .22) * unit}px ` +
      `${(element.shadow.y + Math.abs(element.tiltY) * .12) * unit}px ` +
      `${Math.max(0, element.shadow.blur * unit)}px ` +
      `${hexToRgba(element.shadow.color, element.shadow.opacity)})`
    : undefined;

  return (
    <div
      style={{
        position: 'relative', width, height, perspective: element.perspective * unit || undefined,
        transformStyle: 'preserve-3d', filter: frameShadow,
        transform: `rotateX(${element.tiltX}deg) rotateY(${element.tiltY}deg)`,
      }}
    >
      <div style={frameStyle}>
        {!bare && !browser && style !== 'outline' && <div style={glassStyle} />}
        <div style={screenStyle}>
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
          {model.cutout === 'dynamic-island' && (
            <div
              style={{
                position: 'absolute', left: '50%', top: '1.15%', width: '28.6%', height: '3.85%',
                transform: 'translateX(-50%)', borderRadius: 999, background: '#000',
              }}
            >
              <i style={{ position: 'absolute', right: '11%', top: '50%', height: '42%', aspectRatio: '1', transform: 'translateY(-50%)', borderRadius: '50%', background: 'radial-gradient(circle at 38% 32%, #2b3644, #07090c 62%)' }} />
            </div>
          )}
          {model.cutout === 'punch-hole' && (
            <div
              style={{
                position: 'absolute', left: '50%', top: '1.3%', width: '3.2%', aspectRatio: '1',
                transform: 'translateX(-50%)', borderRadius: '50%', background: '#050506',
                boxShadow: '0 0 0 1px rgba(255,255,255,.08)',
              }}
            />
          )}
          {model.cutout === 'notch' && (
            <div style={{ position: 'absolute', left: '50%', top: 0, width: '18%', height: '4%', transform: 'translateX(-50%)', borderRadius: '0 0 28% 28%', background: '#080809' }} />
          )}
          {model.cutout === 'home-button' && (
            <div style={{ position: 'absolute', left: '50%', bottom: '-8.4%', width: '11%', aspectRatio: '1', transform: 'translateX(-50%)', borderRadius: '50%', border: `${frameWidth * .008}px solid ${real ? finish.edge : '#666'}`, background: '#101113' }} />
          )}
        </div>
        {real && band > 0 && (model.family === 'iphone' || model.family === 'android-phone') && (
          <>
            {(['left', 'right'] as const).flatMap((side) => ['7.5%', '92.5%'].map((top) => (
              <span
                key={`${side}-${top}`}
                style={{ position: 'absolute', [side]: 0, top, width: band, height: frameWidth * .009, background: hexToRgba(finish.shadow, .55), pointerEvents: 'none' }}
              />
            )))}
          </>
        )}
        {element.style !== 'none' && model.kind === 'laptop' && <LaptopBase width={frameWidth} body={body} finish={finish} real={real} />}
        {!bare && !browser && element.showButtons && model.buttons.map((button, index) => {
          const vertical = button.side !== 'top';
          const thick = frameWidth * (model.kind === 'phone' ? .0075 : .005);
          const shape: CSSProperties = vertical
            ? { [button.side]: -thick + hairline, top: `${button.offset * 100}%`, width: thick, height: button.length * frameHeight, borderRadius: button.side === 'left' ? `${thick}px 0 0 ${thick}px` : `0 ${thick}px ${thick}px 0` }
            : { left: `${button.offset * 100}%`, top: -thick + hairline, width: button.length * frameWidth, height: thick, borderRadius: `${thick}px ${thick}px 0 0` };
          const fill = style === 'outline'
            ? 'transparent'
            : real
              ? `linear-gradient(${button.side === 'left' ? 90 : button.side === 'right' ? 270 : 180}deg, ${finish.shadow}, ${finish.edge} 55%, ${finish.body})`
              : clay ? mixDark(element.tint, .12) : element.tint;
          return (
            <span
              key={`${button.side}-${index}`}
              style={{
                position: 'absolute', ...shape, background: fill,
                border: style === 'outline' ? `1px solid ${element.tint}` : undefined,
                boxShadow: real ? `0 0 0 ${hairline}px rgba(0,0,0,.3)` : undefined,
              }}
            />
          );
        })}
        {Math.abs(element.tiltY) > 5 && element.style !== 'none' && (
          <div
            style={{
              position: 'absolute', top: '4%', bottom: '4%',
              [element.tiltY > 0 ? 'right' : 'left']: '-1.5%', width: frameWidth * .022,
              borderRadius: frameWidth * .01,
              background: real ? `linear-gradient(90deg, ${finish.shadow}, ${finish.body})` : hexToRgba('#000000', .24),
              opacity: .9,
            }}
          />
        )}
        {model.kind === 'browser' && <BrowserChrome width={frameWidth} />}
        {model.kind === 'tablet' && rotated && (
          <span
            style={{
              position: 'absolute', left: '50%', top: '1.1%', width: frameWidth * .007,
              aspectRatio: '1', transform: 'translateX(-50%)', borderRadius: '50%',
              background: '#111214', boxShadow: '0 0 0 1px rgba(255,255,255,.22)',
            }}
          />
        )}
        {model.kind === 'laptop' && (
          <div style={{ position: 'absolute', top: `${screenY + screenHeight * .005}px`, left: `${screenX + screenWidth * .485}px`, width: frameWidth * .012, aspectRatio: '1', borderRadius: '50%', background: '#111' }} />
        )}
      </div>
    </div>
  );
}

/** Darken a hex color toward black by `amount` (0..1). */
function mixDark(hex: string, amount = .2): string {
  const raw = hex.replace('#', '');
  const channel = (offset: number) => Math.round(parseInt(raw.slice(offset, offset + 2), 16) * (1 - amount));
  if (!/^[\da-f]{6}/i.test(raw)) return hex;
  return `rgb(${channel(0)}, ${channel(2)}, ${channel(4)})`;
}

function LaptopBase({ width, body, finish, real }: { width: number; body: string; finish: DeviceModel['finishes'][number]; real: boolean }): ReactElement {
  return (
    <>
      <div
        style={{
          position: 'absolute', left: '-5%', width: '110%', top: '79.2%', height: '18%',
          borderRadius: `0 0 ${width * .035}px ${width * .035}px`,
          background: real
            ? `linear-gradient(180deg, ${finish.shadow}, ${finish.body} 14%, ${finish.edge} 20%, ${finish.body} 34%, ${finish.shadow})`
            : body,
          boxShadow: `0 ${width * .012}px ${width * .025}px rgba(0,0,0,.38), inset 0 1px rgba(255,255,255,.45)`,
        }}
      />
      <div style={{ position: 'absolute', left: '40%', width: '20%', top: '80%', height: '1.5%', borderRadius: '0 0 50% 50%', background: real ? finish.shadow : hexToRgba('#000000', .2) }} />
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
