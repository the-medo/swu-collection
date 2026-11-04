import type { Frame, GameState } from './model.ts';

export function modeAvailable(
  state: GameState,
  frame: Extract<Frame, { kind: 'effect' }>,
  mode: string,
) {
  const effect = frame.effect;
  if (effect.kind !== 'choose-mode' || !effect.oncePerPhase) return true;
  const origin = frame.origin?.card ?? frame.source;
  return !state.phaseHistory.modeUses?.some(
    use =>
      use.source.instanceId === frame.source.instanceId &&
      use.source.incarnation === frame.source.incarnation &&
      use.origin.instanceId === origin.instanceId &&
      use.origin.incarnation === origin.incarnation &&
      use.key === `${effect.oncePerPhase}:${mode}`,
  );
}
