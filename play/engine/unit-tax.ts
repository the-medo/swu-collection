import { resourcePayment } from './resource-payment.ts';
import { canAffectWithAbility } from './protection.ts';
import type { Frame, GameState } from './model.ts';
import { instance, fact, reference } from './state.ts';
import { isUnit } from './attachments.ts';
import { spendingPower } from './credits.ts';
import { payAbilityCosts } from './abilities.ts';
export type UnitTaxFrame = Extract<Frame, { kind: 'unit-tax' }>;
export function taxSelection(state: GameState, frame: UnitTaxFrame) {
  return {
    cards: frame.cards.map(c => c.instanceId),
    min: 0,
    max: Math.min(
      frame.cards.length,
      Math.floor(
        spendingPower(state, frame.chooser) / resourcePayment(state, frame.chooser, frame.amount),
      ),
    ),
  };
}
export function assertUnitTax(state: GameState, frame: UnitTaxFrame) {
  const units = [...state.ground, ...state.space]
    .map(id => instance(state, id))
    .filter(c => isUnit(state, c) && c.controller === frame.chooser)
    .map(reference);
  if (
    !state.seats.includes(frame.chooser) ||
    JSON.stringify(units) !== JSON.stringify(frame.cards.map(reference))
  )
    throw new Error('Invalid unit tax participants');
}
export function applyUnitTax(
  state: GameState,
  frame: UnitTaxFrame,
  selected: string[],
  credit = 0,
) {
  payAbilityCosts(
    state,
    { ...frame.source, controller: frame.chooser },
    {
      id: 'unit-tax-payment',
      limit: null,
      costs: selected.map(() => ({ kind: 'resources' as const, amount: frame.amount })),
      effects: [],
    },
    credit,
  );
  const unpaid = frame.cards
    .filter(
      c =>
        !selected.includes(c.instanceId) &&
        canAffectWithAbility(state, instance(state, c.instanceId), frame.source, 'exhaust'),
    )
    .map(c => instance(state, c.instanceId));
  // All choices and payments are fixed before any unit exhausts (v8 §8.34).
  const changed = unpaid.filter(c => !c.exhausted);
  for (const card of unpaid) card.exhausted = true;
  for (const card of changed) fact(state, 'exhausted', frame.playerId, [frame.source, card]);
  if (selected.length)
    fact(
      state,
      'ability-used',
      frame.chooser,
      [frame.source, ...selected.map(id => instance(state, id))],
      selected.length * resourcePayment(state, frame.chooser, frame.amount),
    );
}
