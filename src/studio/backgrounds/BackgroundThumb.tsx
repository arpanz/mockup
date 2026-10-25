import { memo } from 'react';
import type { ReactElement } from 'react';
import type { Background } from '../model/types';
import { BackgroundLayer } from './BackgroundLayer';

export interface BackgroundThumbProps {
  background: Background;
  size?: number;
  /** Height / width. Defaults to a phone screenshot. */
  aspect?: number;
  resolveAsset?: (assetId: string) => string | undefined;
}

function BackgroundThumbView({ background, size = 56, aspect = 19.5 / 9, resolveAsset = () => undefined }: BackgroundThumbProps): ReactElement {
  const height = size * aspect;
  return <div style={{
    width: size,
    height,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    background: '#18181B',
    flex: 'none',
  }}>
    <BackgroundLayer background={background} width={size} height={height} unit={size / 1000} resolveAsset={resolveAsset} />
  </div>;
}

export const BackgroundThumb = memo(BackgroundThumbView);
