import { unitProfile } from './abilities.ts';
import { cardDefinition } from '../cards/catalog.ts';
import { abilityOrigins, originAbilities, potentialAbilitySources } from './effective-abilities.ts';
import { conditionMatches } from './conditions.ts';
import { evaluate, type Evaluation } from './evaluation.ts';
import { matchesUnit } from './targets.ts';
import { activeLasting } from './lasting.ts';
import type { CardInstance, GameState } from './model.ts';

function activeProfiles(state: GameState, evaluation?: Evaluation) {
  return potentialAbilitySources(state, 'printedStats').flatMap(source =>
    abilityOrigins(state, source, evaluation).flatMap(origin =>
      origin.suppressed
        ? []
        : (originAbilities(state, origin)?.printedStats ?? []).flatMap((profile, index) => {
            const key = `printed-${source.instanceId}-${source.incarnation}-${source.controller}-${origin.id}-${origin.card.incarnation}-${index}`;
            return evaluate(evaluation, key, next =>
              conditionMatches(state, source.controller, profile.condition, { source }, next),
            )
              ? [{ key, source, profile }]
              : [];
          }),
    ),
  );
}
// This is authoritative history, not a memoization cache. An inactive ability
// gets a new order when it becomes active again, after any earlier lasting effect.
export function reconcilePrintedStats(state: GameState) {
  const profiles = activeProfiles(state);
  state.printedStatActivations = state.printedStatActivations.filter(entry =>
    profiles.some(p => p.key === entry.key),
  );
  for (const profile of profiles)
    if (!state.printedStatActivations.some(entry => entry.key === profile.key))
      state.printedStatActivations.push({ key: profile.key, order: state.nextId++ });
}
export function assertPrintedStats(state: GameState) {
  const keys = activeProfiles(state).map(p => p.key);
  if (
    new Set(state.printedStatActivations.map(p => p.key)).size !== keys.length ||
    state.printedStatActivations.length !== keys.length ||
    new Set(state.printedStatActivations.map(p => p.order)).size !== keys.length ||
    state.printedStatActivations.some(
      p => !keys.includes(p.key) || p.order < 1 || p.order >= state.nextId,
    )
  )
    throw new Error('Invalid printed-stat activation history');
}
export function printedUnitStats(state: GameState, unit: CardInstance, evaluation?: Evaluation) {
  const printed = unitProfile(cardDefinition(state, unit.cardId));
  let power = printed.power,
    hp = printed.hp,
    powerOrder = -1,
    hpOrder = -1;
  const apply = (order: number, nextPower?: number, nextHp?: number) => {
    if (nextPower !== undefined && order > powerOrder) {
      power = nextPower;
      powerOrder = order;
    }
    if (nextHp !== undefined && order > hpOrder) {
      hp = nextHp;
      hpOrder = order;
    }
  };
  for (const { key, source, profile } of activeProfiles(state, evaluation))
    if (
      evaluate(evaluation, `target-${key}-${unit.instanceId}`, next =>
        matchesUnit(state, unit, source.controller, profile.filter, { source }, next),
      )
    ) {
      // A newly active profile may be queried during entry before maintenance
      // persists it. Read it as newest without mutating a projection/stat query.
      const order = state.printedStatActivations.find(p => p.key === key)?.order ?? state.nextId;
      apply(order, profile.power, profile.hp);
    }
  for (const lasting of activeLasting(state, unit))
    apply(Number(lasting.id.slice(1)), lasting.printedPower, lasting.printedHp);
  return { power, hp };
}
