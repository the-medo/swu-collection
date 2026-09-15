import { attackTargets } from './actions.ts';
import { matchingUnits, matchesUnit } from './targets.ts';
import { isUnit } from './attachments.ts';
import { unitIsLeader } from './attributes.ts';
import type { CardReference, Frame, GameState, Intent } from './model.ts';

export type CapturePairs = Extract<Frame, { kind: 'capture-pairs' }>;
export type AttackSeries = Extract<Frame, { kind: 'attack-series' }>;
const sameIncarnation = (state: GameState, ref: CardReference) => {
  const card = state.cards[ref.instanceId];
  return card?.incarnation === ref.incarnation && card.cardId === ref.cardId ? card : null;
};
const same = (a: CardReference, b: CardReference) =>
  a.instanceId === b.instanceId && a.incarnation === b.incarnation;
export function capturePrisoners(state: GameState, frame: CapturePairs, guard: CardReference) {
  const current = sameIncarnation(state, guard);
  return current && isUnit(state, current)
    ? matchingUnits(state, frame.playerId, {
        controller: 'enemy',
        nonLeader: true,
        arena: current.zone as 'ground' | 'space',
      }).filter(unit => !frame.pairs.some(p => same(p.prisoner, unit)))
    : [];
}
export function sequenceIntents(state: GameState, frame: CapturePairs | AttackSeries): Intent[] {
  if (frame.kind === 'attack-series')
    return [
      ...matchingUnits(state, frame.playerId, frame.filter, frame)
        .filter(
          unit =>
            unit.controller === frame.playerId &&
            (!unit.exhausted || frame.evenIfExhausted) &&
            !frame.used.some(ref => same(ref, unit)) &&
            attackTargets(state, unit, frame.unitsOnly).length,
        )
        .map(unit => ({ kind: 'target' as const, card: unit.instanceId })),
      { kind: 'decline-effect' },
    ];
  const cards = frame.chosenGuard
    ? capturePrisoners(state, frame, frame.chosenGuard)
    : frame.guards.filter(
        guard =>
          !frame.pairs.some(p => same(p.guard, guard)) &&
          capturePrisoners(state, frame, guard).length,
      );
  return cards.map(card => ({ kind: 'target' as const, card: card.instanceId }));
}
export function assertSequence(state: GameState, frame: CapturePairs | AttackSeries) {
  if (!state.seats.includes(frame.playerId)) throw new Error('Invalid sequence controller');
  if (frame.kind === 'attack-series') {
    if (
      new Set(frame.used.map(r => `${r.instanceId}:${r.incarnation}`)).size !== frame.used.length ||
      frame.used.some(
        r =>
          !state.cards[r.instanceId] ||
          state.cards[r.instanceId]!.cardId !== r.cardId ||
          state.cards[r.instanceId]!.incarnation < r.incarnation,
      )
    )
      throw new Error('Invalid attack series history');
    return;
  }
  if (
    new Set(frame.guards.map(r => r.instanceId)).size !== frame.guards.length ||
    new Set(frame.pairs.map(p => p.guard.instanceId)).size !== frame.pairs.length ||
    new Set(frame.pairs.map(p => p.prisoner.instanceId)).size !== frame.pairs.length
  )
    throw new Error('Duplicate capture pair');
  for (const guard of frame.guards) {
    const unit = sameIncarnation(state, guard);
    if (!unit || !isUnit(state, unit) || unit.controller !== frame.playerId)
      throw new Error('Invalid capture guard');
  }
  if (
    frame.chosenGuard &&
    (!frame.guards.some(g => same(g, frame.chosenGuard!)) ||
      frame.pairs.some(p => same(p.guard, frame.chosenGuard!)))
  )
    throw new Error('Invalid chosen guard');
  for (const pair of frame.pairs) {
    const unit = sameIncarnation(state, pair.prisoner),
      guard = sameIncarnation(state, pair.guard);
    if (
      !frame.guards.some(g => same(g, pair.guard)) ||
      !unit ||
      !guard ||
      !isUnit(state, unit) ||
      unitIsLeader(state, unit) ||
      unit.controller === frame.playerId ||
      unit.zone !== guard.zone ||
      !matchesUnit(state, guard, frame.playerId, { controller: 'friendly' })
    )
      throw new Error('Invalid capture pair');
  }
}
