import type { DefeatPreparation } from './model.ts';
import { assertAbilityOrigins } from './effective-abilities.ts';
import { cardDefinition } from '../cards/catalog.ts';
import { isUnit } from './attachments.ts';
import { effectiveAbilities } from './effective-abilities.ts';
import type { CardInstance, Frame, GameState } from './model.ts';
import { matchingUnits } from './targets.ts';
import { reference } from './state.ts';
import { upgradeProfile } from './roles.ts';
export type UnitDefeatFrame = Extract<Frame, { kind: 'unit-defeat' }>;
export const defeatAttachmentFilter = {
  controller: 'friendly',
  trait: 'Vehicle',
  withoutPilot: true,
} as const;
export function defeatAttachmentTargets(state: GameState, card: CardInstance) {
  if (
    !isUnit(state, card) ||
    !effectiveAbilities(state, card).defeatToUpgrade ||
    !upgradeProfile(cardDefinition(state, card.cardId))
  )
    return [];
  return matchingUnits(state, card.controller, defeatAttachmentFilter, { source: card }).filter(
    c => c.instanceId !== card.instanceId,
  );
}
export function unitDefeatChoice(state: GameState, frame: UnitDefeatFrame) {
  const ref = frame.pending[0],
    card = ref && state.cards[ref.instanceId];
  return card &&
    card.incarnation === ref!.incarnation &&
    isUnit(state, card) &&
    defeatAttachmentTargets(state, card).length
    ? card
    : undefined;
}
export function deferUnitDefeat(
  state: GameState,
  cards: CardInstance[],
  combatDamaged: ReturnType<typeof reference>[],
  source?: CardInstance,
  prepared?: DefeatPreparation,
) {
  const pending = cards.filter(card => defeatAttachmentTargets(state, card).length).map(reference);
  if (!pending.length) return false;
  state.execution.frames.unshift({
    kind: 'unit-defeat',
    ...(prepared ? { prepared: structuredClone(prepared) } : {}),
    cards: cards.map(c => structuredClone(c)),
    pending,
    combatDamaged: structuredClone(combatDamaged),
    ...(source ? { source: structuredClone(source) } : {}),
  });
  return true;
}
export function assertUnitDefeat(state: GameState, frame: UnitDefeatFrame) {
  const ids = new Set<string>();
  for (const card of frame.cards) {
    const current = state.cards[card.instanceId];
    if (
      !current ||
      current.cardId !== card.cardId ||
      current.incarnation !== card.incarnation ||
      !isUnit(state, card) ||
      ids.has(card.instanceId)
    )
      throw Error('Invalid deferred unit defeat');
    ids.add(card.instanceId);
  }
  if (
    new Set(frame.pending.map(c => c.instanceId)).size !== frame.pending.length ||
    frame.pending.some(
      ref =>
        !frame.cards.some(
          c =>
            c.instanceId === ref.instanceId &&
            c.incarnation === ref.incarnation &&
            c.cardId === ref.cardId,
        ),
    )
  )
    throw Error('Invalid defeat replacement choice');
  if (frame.prepared) {
    for (const departure of frame.prepared.departures) {
      if (
        !frame.cards.some(
          c =>
            c.instanceId === departure.unit.reference.instanceId &&
            c.incarnation === departure.unit.reference.incarnation,
        )
      )
        throw Error('Invalid prepared departure');
      assertAbilityOrigins(state, departure.unit.abilities);
    }
    for (const observer of frame.prepared.observers) assertAbilityOrigins(state, observer.origins);
  }
  if (frame.source) {
    const current = state.cards[frame.source.instanceId];
    if (
      !current ||
      current.cardId !== frame.source.cardId ||
      current.incarnation < frame.source.incarnation ||
      !state.seats.includes(frame.source.controller)
    )
      throw Error('Invalid defeat source');
  }
}
