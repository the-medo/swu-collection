import { cardDefinition } from '../cards/catalog.ts';
import { commitUpgradeDefeat, isUnit, type AbilityObserver } from './attachments.ts';
import { abilitiesFrom, abilityOrigins, assertAbilityOrigins } from './effective-abilities.ts';
import type { CardInstance, Frame, GameState } from './model.ts';
import { detachPilot } from './pilot-conversion.ts';
import { isUpgrade, upgradeProfile } from './roles.ts';
import { fact } from './state.ts';

type UpgradeDefeat = Extract<Frame, { kind: 'upgrade-defeat' }>;
export function pendingUpgradeDefeats(state: GameState) {
  return state.execution.frames.filter(
    (frame): frame is UpgradeDefeat => frame.kind === 'upgrade-defeat',
  );
}
export function hasUpgradeWork(state: GameState) {
  return state.execution.frames.some(
    f =>
      f.kind === 'upgrade-defeat' ||
      f.kind === 'base-upgrade-protection' ||
      f.kind === 'convert-pilot' ||
      f.kind === 'unit-defeat',
  );
}
// Replacement choices precede the caller's later effects and all pending triggers.
// Callers can still enqueue ordinary continuations after requesting a defeat.
export function prioritizeUpgradeDefeat(state: GameState) {
  let index = state.execution.frames.findIndex(f => f.kind === 'upgrade-defeat');
  if (index < 0)
    index = state.execution.frames.findIndex(f => f.kind === 'base-upgrade-protection');
  if (index < 0)
    index = state.execution.frames.findIndex(
      f => f.kind === 'convert-pilot' || f.kind === 'unit-defeat',
    );
  if (index > 0) state.execution.frames.unshift(state.execution.frames.splice(index, 1)[0]!);
}
export function deferUpgradeDefeat(
  state: GameState,
  card: CardInstance,
  observers: AbilityObserver[],
) {
  if (
    pendingUpgradeDefeats(state).some(
      f => f.card.instanceId === card.instanceId && f.card.incarnation === card.incarnation,
    )
  )
    return true;
  const origins = abilityOrigins(state, card);
  const definition = cardDefinition(state, card.cardId);
  if (
    (definition.kind !== 'unit' && definition.kind !== 'leader') ||
    !abilitiesFrom(state, origins).defeatToUnit
  )
    return false;
  state.execution.frames.unshift({
    kind: 'upgrade-defeat',
    card: structuredClone(card),
    origins: structuredClone(origins),
    observers: structuredClone(observers),
  });
  // A replacement fulfills the original instruction and its costs / "if you do"
  // condition even though it does not cause a defeat event (v8 §§1.8.10, 8.9.2).
  return true;
}
export function resolveUpgradeDefeat(state: GameState, frame: UpgradeDefeat, replace: boolean) {
  const card = state.cards[frame.card.instanceId];
  if (!card || card.incarnation !== frame.card.incarnation || !isUpgrade(state, card))
    throw new Error('Missing upgrade being defeated');
  if (replace) {
    fact(state, 'upgrade-defeat-replaced', frame.card.controller, [frame.card]);
    detachPilot(state, card, frame.card);
  } else commitUpgradeDefeat(state, card, frame.observers, frame.origins);
}
export function assertUpgradeWork(
  state: GameState,
  frame: UpgradeDefeat | Extract<Frame, { kind: 'convert-pilot' }>,
) {
  if (frame.kind === 'convert-pilot') {
    const pilot = state.cards[frame.pilot.instanceId],
      host = state.cards[frame.host.instanceId],
      source = state.cards[frame.source.instanceId];
    if (
      !pilot ||
      !host ||
      !source ||
      pilot.cardId !== frame.pilot.cardId ||
      host.cardId !== frame.host.cardId ||
      pilot.incarnation !== frame.pilot.incarnation ||
      host.incarnation !== frame.host.incarnation ||
      !isUnit(state, pilot) ||
      !isUnit(state, host) ||
      !upgradeProfile(cardDefinition(state, pilot.cardId)) ||
      source.cardId !== frame.source.cardId ||
      source.incarnation < frame.source.incarnation ||
      !state.seats.includes(frame.source.controller) ||
      !pendingUpgradeDefeats(state).length
    )
      throw new Error('Invalid pending Pilot conversion');
    return;
  }
  const current = state.cards[frame.card.instanceId];
  assertAbilityOrigins(state, frame.origins);
  const self = frame.origins.find(o => o.id === 'self');
  if (
    !current ||
    current.cardId !== frame.card.cardId ||
    current.incarnation !== frame.card.incarnation ||
    current.controller !== frame.card.controller ||
    current.owner !== frame.card.owner ||
    current.visibility !== frame.card.visibility ||
    JSON.stringify(current.attachedTo) !== JSON.stringify(frame.card.attachedTo) ||
    !isUpgrade(state, current) ||
    !isUpgrade(state, frame.card) ||
    !self ||
    self.card.instanceId !== frame.card.instanceId ||
    self.card.incarnation !== frame.card.incarnation ||
    !abilitiesFrom(state, frame.origins).defeatToUnit ||
    !upgradeProfile(cardDefinition(state, current.cardId)) ||
    pendingUpgradeDefeats(state).filter(f => f.card.instanceId === current.instanceId).length !== 1
  )
    throw new Error('Invalid pending upgrade defeat');
  const seen = new Set<string>();
  for (const observer of frame.observers) {
    assertAbilityOrigins(state, observer.origins);
    const card = state.cards[observer.source.instanceId];
    if (
      !card ||
      card.cardId !== observer.source.cardId ||
      card.incarnation < observer.source.incarnation ||
      !state.seats.includes(observer.source.controller) ||
      seen.has(observer.source.instanceId)
    )
      throw new Error('Invalid upgrade defeat observer');
    seen.add(observer.source.instanceId);
  }
}
