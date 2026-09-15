import { effectiveAbilities, abilitiesFrom } from './effective-abilities.ts';
import { isUnit, unitStats } from './attachments.ts';
import { abilitySources } from './triggers.ts';
import type { CardInstance, Frame, GameState } from './model.ts';
import { instance } from './state.ts';
export type AllocationFrame = Extract<Frame, { kind: 'allocate-indirect' }>;
export function indirectFrame(
  state: GameState,
  playerId: string,
  source: CardInstance,
  recipient: string,
  amount: number,
): AllocationFrame {
  const abilities = abilitySources(state)
    .filter(c => c.controller === playerId)
    .map(c => effectiveAbilities(state, c));
  const current = state.cards[source.instanceId];
  const own =
    current && current.incarnation === source.incarnation && isUnit(state, current)
      ? effectiveAbilities(state, current)
      : abilitiesFrom(
          state,
          state.departedUnits.find(
            d =>
              d.reference.instanceId === source.instanceId &&
              d.reference.incarnation === source.incarnation,
          )?.abilities ?? [],
        );
  const opponent = playerId !== recipient;
  return {
    kind: 'allocate-indirect',
    playerId,
    source: structuredClone(source),
    recipient,
    assigner:
      own.assignsOwnIndirect || (opponent && abilities.some(a => a.assignsOpponentIndirect))
        ? playerId
        : recipient,
    amount: Math.max(
      0,
      amount + (opponent ? abilities.reduce((sum, a) => sum + (a.indirectBonus ?? 0), 0) : 0),
    ),
  };
}
export function indirectSelection(state: GameState, frame: AllocationFrame) {
  const units = [...state.ground, ...state.space]
    .map(id => instance(state, id))
    .filter(c => isUnit(state, c) && c.controller === frame.recipient);
  const base = state.players[frame.recipient]!.base;
  const limits = Object.fromEntries([
    ...units.map(c => [c.instanceId, Math.max(0, unitStats(state, c).hp - c.damage)] as const),
    [base, frame.amount],
  ]);
  return {
    cards: [...units.map(c => c.instanceId), base],
    min: frame.amount,
    max: frame.amount,
    allocation: { limits },
  };
}
