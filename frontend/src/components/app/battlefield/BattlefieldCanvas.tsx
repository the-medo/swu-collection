import { battlefieldDrawOrder } from '../../../../../shared/battlefield/layers.ts';
import { memo, useId, useMemo, type ReactNode, type Ref } from 'react';
import { battlefieldItems } from '../../../../../shared/battlefield/catalog.ts';
import {
  battlefieldDefaultLight,
  type BattlefieldScene,
} from '../../../../../shared/types/battlefield.ts';
import {
  battlefieldLightDirection,
  battlefieldLightInFrame,
  type BattlefieldLightPosition,
  type BattlefieldLightFrame,
} from '../../../../../shared/battlefield/lighting.ts';
import { BattlefieldArt } from './BattlefieldArt';

export function BattlefieldCanvas({
  scene,
  children,
  className,
  decorative = false,
  light,
  lightFrame,
  ref,
}: {
  scene: BattlefieldScene;
  children?: ReactNode;
  className?: string;
  decorative?: boolean;
  // A caller can drive lighting live, independently of the saved scene. Pass a
  // frame when several Battlefields share one source in a common coordinate space.
  light?: BattlefieldLightPosition;
  lightFrame?: BattlefieldLightFrame;
  ref?: Ref<SVGSVGElement>;
}) {
  const id = useId().replace(/:/g, '');
  const placements = useMemo(() => battlefieldDrawOrder(scene, true), [scene]);
  let activeLight = light ?? scene.light ?? battlefieldDefaultLight;
  if (light && lightFrame) {
    try {
      activeLight = battlefieldLightInFrame(light, lightFrame);
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      // A hidden or not-yet-measured board still renders its saved lighting.
      activeLight = scene.light ?? battlefieldDefaultLight;
    }
  }
  return (
    <svg
      ref={ref}
      viewBox="0 0 1600 400"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role={decorative ? undefined : children ? 'group' : 'img'}
      aria-label={decorative ? undefined : children ? 'Battlefield canvas' : 'Battlefield preview'}
      aria-hidden={decorative || undefined}
    >
      <BattlefieldBackground id={id} backgroundId={scene.backgroundId} />
      {placements.map(p => {
        const item = battlefieldItems[p.itemId];
        if (!item) return null;
        return (
          <g
            key={p.id}
            transform={
              'translate(' + p.x + ' ' + p.y + ') rotate(' + p.rotation + ') scale(' + p.scale + ')'
            }
          >
            <BattlefieldArt
              item={item}
              lightDirection={battlefieldLightDirection(p, activeLight)}
              color={battlefieldItems[p.colorId]?.color}
              textureId={p.textureId}
              frame={{
                x: -(item.width ?? 80) / 2,
                y: -(item.height ?? 80) / 2,
                width: item.width ?? 80,
                height: item.height ?? 80,
              }}
            />
          </g>
        );
      })}
      {children}
    </svg>
  );
}

const BattlefieldBackground = memo(function BattlefieldBackground({
  id,
  backgroundId,
}: {
  id: string;
  backgroundId: string;
}) {
  const shades = battlefieldItems[backgroundId]?.shades ?? ['#0a141e', '#263f50', '#5d7981'];
  return (
    <>
      <defs>
        <radialGradient id={id + '-sky'} cx="75%" cy="130%" r="110%">
          <stop stopColor={shades[2]} />
          <stop offset=".28" stopColor={shades[1]} />
          <stop offset=".8" stopColor={shades[0]} />
        </radialGradient>
      </defs>
      <rect width="1600" height="400" fill={'url(#' + id + '-sky)'} />
      {Array.from({ length: 110 }, (_, i) => (
        <circle
          key={i}
          cx={(i * 137 + 53) % 1600}
          cy={(i * 71 + 27) % 400}
          r={i % 11 === 0 ? 1.35 : 0.7}
          fill={i % 7 === 0 ? '#e6d4a4' : '#dbe4ec'}
          opacity={0.3 + (i % 5) * 0.12}
        />
      ))}
    </>
  );
});
