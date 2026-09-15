import { recordHealing } from './healing.ts';
import type { Frame, GameState } from './model.ts';
import { instance } from './state.ts';
import { matchingUnits } from './targets.ts';
export type BenefitFrame = Extract<Frame, { kind: 'allocate-benefit' }>;
export function benefitSelection(state: GameState, frame: BenefitFrame) {
  const cards = matchingUnits(state, frame.playerId, frame.effect.filter, frame).filter(
    c => frame.effect.benefit !== 'heal' || c.damage > 0,
  );
  const limits = Object.fromEntries(
    cards.map(c => [
      c.instanceId,
      frame.effect.benefit === 'heal'
        ? Math.min(c.damage, frame.effect.amount)
        : frame.effect.amount,
    ]),
  );
  return {
    cards: cards.map(c => c.instanceId),
    min: frame.effect.exact
      ? Math.min(
          frame.effect.amount,
          Object.values(limits).reduce((a, b) => a + b, 0),
        )
      : 0,
    max: Math.min(
      frame.effect.amount,
      Object.values(limits).reduce((a, b) => a + b, 0),
    ),
    allocation: { limits, ...(frame.effect.quantum ? { quantum: frame.effect.quantum } : {}) },
  };
}
export function applyHealing(state: GameState, frame: BenefitFrame, selections: string[]) {
  const counts = new Map<string, number>();
  for (const id of selections) counts.set(id, (counts.get(id) ?? 0) + 1);
  if (frame.effect.benefit !== 'heal')
    throw new Error('Token benefits require a creation continuation');
  let applied = 0;
  for (const [id, amount] of counts) {
    const card = instance(state, id);
    const healed = Math.min(card.damage, amount);
    card.damage -= healed;
    applied += healed;
    recordHealing(state, frame.playerId, frame.source, card, healed);
  }
  return applied;
}
