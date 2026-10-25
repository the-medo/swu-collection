import { memo } from 'react';
import { BattlefieldCanvas } from '@/components/app/battlefield/BattlefieldCanvas.tsx';
import type { CrossfireBattlefields } from '../../../../../shared/types/crossfire.ts';
import { defaultBattlefieldScene } from '../../../../../shared/types/battlefield.ts';

const neutralSky = defaultBattlefieldScene();

/** Cosmetic layers stay independent of engine revisions and card interactions. */
export const BoardBattlefields = memo(function BoardBattlefields({
  battlefields,
  upper,
  lower,
}: {
  battlefields?: CrossfireBattlefields;
  upper: string;
  lower: string;
}) {
  const sides = [upper, lower].map(seat => {
    const scene = seat === 'p1' ? battlefields?.p1 : seat === 'p2' ? battlefields?.p2 : null;
    return { seat, scene };
  });
  if (!sides.some(({ scene }) => scene)) return null;

  return (
    <>
      <div className="cf-battlefield-skies" aria-hidden="true">
        {sides.map(({ seat, scene }, index) => (
          <BattlefieldCanvas
            key={seat}
            scene={scene ?? neutralSky}
            decorative
            content="background"
            preserveAspectRatio="xMidYMid slice"
            mirrorDiagonal={index === 0}
          />
        ))}
      </div>
      {sides.map(({ seat, scene }, index) =>
        scene ? (
          <div
            key={seat}
            className={`cf-player-battlefield ${index === 0 ? 'cf-battlefield-upper' : 'cf-battlefield-lower'}`}
            data-battlefield-seat={seat}
            aria-hidden="true"
          >
            <BattlefieldCanvas
              scene={scene}
              decorative
              content="objects"
              preserveAspectRatio="xMidYMid slice"
              mirrorDiagonal={index === 0}
            />
          </div>
        ) : null,
      )}
      <div className="cf-battlefield-shade" aria-hidden="true" />
    </>
  );
});
