import { useRef } from 'react';
import type { BattlefieldScene } from '../../../../../shared/types/battlefield.ts';
import { BattlefieldCanvas } from './BattlefieldCanvas';
import { useBattlefieldLightMotion } from './useBattlefieldLightMotion';

export function AnimatedBattlefieldPreview({ scene }: { scene: BattlefieldScene }) {
  const viewport = useRef<SVGSVGElement>(null);
  const light = useBattlefieldLightMotion(scene.light, viewport);
  return (
    <BattlefieldCanvas
      ref={viewport}
      scene={scene}
      light={light}
      decorative
      className="aspect-[4/1] w-full"
    />
  );
}
