import { queueCopyEntry } from './unit-entry.ts';
import { canAffectWithAbility } from './protection.ts';
import type { CardEffect } from '../cards/definition.ts';
import type { EffectContext } from './bindings.ts';
import { boundReference } from './bindings.ts';
import { matchesUnit } from './targets.ts';
import { opponent } from './state.ts';
import { abilitySources, collectTriggers, effectFrames } from './triggers.ts';
import { effectiveAbilities } from './effective-abilities.ts';
import { recordUnitEntry, friendlyUnitsEnterReady } from './phase-history.ts';
import { cardDefinition } from '../cards/catalog.ts';
import { isUnit } from './attachments.ts';
import { unitIsLeader } from './attributes.ts';
import { conditionMatches } from './conditions.ts';
import { namedAbilityLoss } from './naming.ts';
import type { CardInstance, GameState } from './model.ts';
import { captureDeparture, type Departure, fact, move, reference } from './state.ts';

// Captivity is out of play, but open information (v8 §§1.17, 8.33).
export function captureUnit(
  state: GameState,
  guard: CardInstance,
  unit: CardInstance,
  actor: string,
  source: CardInstance,
  from?: 'discard',
  simultaneous?: { departure: Departure; rescues: CardInstance[] },
): boolean {
  if (
    !(isUnit(state, guard) || cardDefinition(state, guard.cardId).kind === 'base') ||
    (from === 'discard'
      ? unit.zone !== 'discard' ||
        unit.owner !== actor ||
        cardDefinition(state, unit.cardId).kind !== 'unit'
      : !isUnit(state, unit)) ||
    unitIsLeader(state, unit) ||
    guard.instanceId === unit.instanceId ||
    !canAffectWithAbility(state, unit, source, 'capture')
  )
    return false;
  if (isUnit(state, unit) && replaceCapture(state, unit)) return false;
  if (isUnit(state, unit) && !simultaneous) collectTriggers(state, 'bounty', [unit]);
  const captor = reference(guard);
  fact(state, 'captured', actor, [source, guard, unit]);
  move(state, unit, 'captured', simultaneous?.departure, simultaneous?.rescues);
  unit.damage = 0;
  unit.exhausted = false;
  if (unit.zone === 'captured')
    unit.capturedBy = { instanceId: captor.instanceId, incarnation: captor.incarnation };
  return true;
}

export function rescueCaptured(state: GameState, unit: CardInstance): boolean {
  if (unit.zone !== 'captured') return false;
  const definition = cardDefinition(state, unit.cardId);
  if (definition.kind !== 'unit' || definition.token) throw new Error('Invalid rescued unit');
  const guard = unit.capturedBy && state.cards[unit.capturedBy.instanceId];
  if (
    queueCopyEntry(state, unit, unit.owner, false, {
      ...(guard ? { guard: reference(guard) } : {}),
    })
  )
    return true;
  const ready =
    friendlyUnitsEnterReady(state, unit.owner) ||
    (!namedAbilityLoss(state, unit) &&
      definition.entersReady &&
      conditionMatches(state, unit.owner, definition.entersReady, { source: unit })) ||
    abilitySources(state).some(
      source =>
        source.controller === unit.owner && effectiveAbilities(state, source).friendlyRescueReady,
    );
  move(state, unit, definition.arena);
  unit.controller = unit.owner;
  unit.damage = 0;
  unit.exhausted = !ready;
  // Entry creates a new copy. Rescue is not a play and grants no When Played,
  // Ambush or Shielded triggers (v8 §8.33.3).
  recordUnitEntry(state, unit);
  fact(state, 'rescued', unit.owner, [...(guard ? [guard] : []), unit]);
  return true;
}

function replaceCapture(state: GameState, unit: CardInstance): boolean {
  const effects = effectiveAbilities(state, unit).captureReplacement;
  if (!effects?.length) return false;
  state.execution.frames.unshift(...effectFrames(unit.controller, structuredClone(unit), effects));
  return true;
}

// Fix every departure and collect Bounties before any simultaneous prisoner leaves.
export function capturePairs(
  state: GameState,
  pairs: { guard: CardInstance; prisoner: CardInstance }[],
  actor: string,
  source: CardInstance,
) {
  pairs = pairs.filter(
    pair =>
      canAffectWithAbility(state, pair.prisoner, source, 'capture') &&
      !replaceCapture(state, pair.prisoner),
  );
  const departures = pairs.map(p => captureDeparture(state, p.prisoner));
  for (const pair of pairs) collectTriggers(state, 'bounty', [pair.prisoner]);
  const rescues: CardInstance[] = [];
  pairs.forEach((pair, i) =>
    captureUnit(state, pair.guard, pair.prisoner, actor, source, undefined, {
      departure: departures[i]!,
      rescues,
    }),
  );
  for (const prisoner of rescues) rescueCaptured(state, prisoner);
}

export function capturedChoices(
  state: GameState,
  playerId: string,
  effect: Extract<CardEffect, { kind: 'select-captured' }>,
  context: EffectContext,
): CardInstance[] {
  const requiredGuard = effect.guard && boundReference(context, effect.guard, state);
  return state.captured
    .map(id => state.cards[id]!)
    .filter(card => {
      if (
        effect.owner &&
        card.owner !== (effect.owner === 'self' ? playerId : opponent(state, playerId))
      )
        return false;
      const link = card.capturedBy;
      const guard = link && state.cards[link.instanceId];
      if (!link || !guard || guard.incarnation !== link.incarnation) return false;
      if (
        effect.guard &&
        (!requiredGuard ||
          link.instanceId !== requiredGuard.instanceId ||
          link.incarnation !== requiredGuard.incarnation)
      )
        return false;
      return (
        !effect.guardFilter ||
        (isUnit(state, guard) && matchesUnit(state, guard, playerId, effect.guardFilter, context))
      );
    });
}
