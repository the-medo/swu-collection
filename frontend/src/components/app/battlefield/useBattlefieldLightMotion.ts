import { useEffect, useState, type RefObject } from 'react';
import {
  animatedBattlefieldLight,
  type BattlefieldLightPosition,
} from '../../../../../shared/battlefield/lighting.ts';

// Slow shading needs few updates; geometry stays fixed between frames.
const frameInterval = 1000 / 15;

export function useBattlefieldLightMotion(
  anchor: BattlefieldLightPosition,
  viewport: RefObject<SVGSVGElement | null>,
): BattlefieldLightPosition {
  const [frame, setFrame] = useState(() => ({ anchor, light: anchor }));
  const { x, y } = anchor;
  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const base = { x, y };
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let inView = false;
    let elapsed = 0;
    let previousTime: number | undefined;
    let previousRender = 0;
    let request: number | undefined;
    const publish = (time: number) => {
      const light = animatedBattlefieldLight(base, time);
      setFrame(current =>
        current.anchor.x === x &&
        current.anchor.y === y &&
        current.light.x === light.x &&
        current.light.y === light.y
          ? current
          : { anchor: base, light },
      );
    };
    const stop = () => {
      if (request !== undefined) cancelAnimationFrame(request);
      request = undefined;
      previousTime = undefined;
    };
    const active = () => inView && !document.hidden && !media.matches;
    const tick = (time: number) => {
      request = undefined;
      if (!active()) {
        previousTime = undefined;
        // A preference change may be observable before its change event arrives.
        if (media.matches) {
          elapsed = 0;
          publish(0);
        }
        return;
      }
      if (previousTime !== undefined) elapsed += time - previousTime;
      previousTime = time;
      if (time - previousRender >= frameInterval) {
        publish(elapsed);
        previousRender = time;
      }
      request = requestAnimationFrame(tick);
    };
    const synchronize = () => {
      if (media.matches) {
        stop();
        elapsed = 0;
        publish(0);
      } else if (active()) {
        if (request === undefined) request = requestAnimationFrame(tick);
      } else stop();
    };
    const observer = new IntersectionObserver(entries => {
      inView = entries.some(entry => entry.isIntersecting);
      synchronize();
    });
    observer.observe(node);
    media.addEventListener('change', synchronize);
    document.addEventListener('visibilitychange', synchronize);
    synchronize();
    return () => {
      stop();
      observer.disconnect();
      media.removeEventListener('change', synchronize);
      document.removeEventListener('visibilitychange', synchronize);
    };
  }, [x, y, viewport]);
  return frame.anchor.x === x && frame.anchor.y === y ? frame.light : anchor;
}
