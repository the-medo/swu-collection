import { isUnit } from './attachments.ts';
import type { CardReference, Frame, GameState } from './model.ts';
import { reference } from './state.ts';
import { matchingUnits } from './targets.ts';

type Sequence = Extract<Frame, { kind: 'different-unit-damage' }>;
export function sequenceDealer(state: GameState, frame: Sequence) {
  const ref = frame.dealers[frame.index];
  const card = ref && state.cards[ref.instanceId];
  return card &&
    card.incarnation === ref.incarnation &&
    card.controller === frame.playerId &&
    isUnit(state, card)
    ? card
    : undefined;
}

export function assertDamageSequence(state: GameState, frame: Sequence) {
  const declaration = frame.declaration;
  const same = (a: readonly CardReference[], b: readonly CardReference[]) =>
    JSON.stringify(a.map(reference)) === JSON.stringify(b.map(reference));
  if (
    !state.seats.includes(frame.playerId) ||
    frame.playerId !== declaration.playerId ||
    JSON.stringify(frame.source) !== JSON.stringify(declaration.source) ||
    frame.amount !== declaration.effect.amount ||
    frame.index > frame.dealers.length ||
    frame.usedTargets.length > frame.index ||
    new Set(frame.units.map(c => c.instanceId)).size !== frame.units.length ||
    frame.units.some(card => {
      const current = state.cards[card.instanceId];
      return (
        !current ||
        current.cardId !== card.cardId ||
        current.owner !== card.owner ||
        current.incarnation < card.incarnation ||
        current.visibility < card.visibility ||
        !state.seats.includes(card.controller) ||
        !isUnit(state, card)
      );
    })
  )
    throw new Error('Invalid unit damage sequence');
  // Keep the declaration's pool: a later death, rescue, or new token must not
  // silently introduce another dealer or recipient midway through this ability.
  const snapshot = {
    ...state,
    cards: { ...state.cards },
    ground: frame.units.filter(c => c.zone === 'ground').map(c => c.instanceId),
    space: frame.units.filter(c => c.zone === 'space').map(c => c.instanceId),
  };
  for (const card of frame.units) snapshot.cards[card.instanceId] = card;
  if (
    !same(
      frame.dealers,
      matchingUnits(snapshot, frame.playerId, { controller: 'friendly' }, declaration).map(
        reference,
      ),
    ) ||
    !same(
      frame.targets,
      matchingUnits(snapshot, frame.playerId, { controller: 'enemy' }, declaration).map(reference),
    ) ||
    new Set(frame.usedTargets.map(c => c.instanceId)).size !== frame.usedTargets.length ||
    frame.usedTargets.some(c => !frame.targets.some(t => same([c], [t])))
  )
    throw new Error('Invalid unit damage sequence');
}
