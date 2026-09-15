import type { CatalogContext } from '../cards/catalog.ts';
import { printedUnitStats } from './printed-stats.ts';
import { deferUpgradeDefeat } from './upgrade-defeat.ts';
import { recordTokenCreation } from './phase-history.ts';
import { conditionMatches } from './conditions.ts';
import { numericValue } from './values.ts';
import { evaluate } from './evaluation.ts';
import { namedAbilityLoss } from './naming.ts';
import { canAffectWithAbility } from './protection.ts';
import { cardTraits } from './attributes.ts';
import { abilityOrigins } from './effective-abilities.ts';
import { abilitySources, collectTriggers } from './triggers.ts';
import type { AbilityOrigin } from './model.ts';
import type { Evaluation } from './evaluation.ts';
import { matchesUnit } from './targets.ts';
import { activeLasting } from './lasting.ts';
import { effectiveAbilities } from './effective-abilities.ts';
import { cardDefinition } from '../cards/catalog.ts';
import { isUpgrade, upgradeProfile } from './roles.ts';
import { unitProfile } from './abilities.ts';
import type { CardInstance, CardReference, GameState } from './model.ts';
import { addCard, fact, instance, isArena, move } from './state.ts';

export function isUnit(state: CatalogContext, card: CardInstance): boolean {
  const definition = cardDefinition(state, card.cardId);
  return (
    isArena(card.zone) &&
    card.attachedTo === null &&
    (definition.kind === 'unit' || (definition.kind === 'leader' && card.deployedAs === 'unit'))
  );
}
export function attachedUpgrades(state: GameState, unit: CardInstance): CardInstance[] {
  return [...state.ground, ...state.space]
    .map(id => instance(state, id))
    .filter(
      card =>
        card.attachedTo?.instanceId === unit.instanceId &&
        card.attachedTo.incarnation === unit.incarnation,
    );
}
export function unitStats(state: GameState, unit: CardInstance, evaluation?: Evaluation) {
  let { power, hp } = printedUnitStats(state, unit, evaluation);
  for (const upgrade of attachedUpgrades(state, unit)) {
    const profile = upgradeProfile(cardDefinition(state, upgrade.cardId));
    if (!profile) throw new Error('Unsupported attachment role');
    power += profile.modifiers.power;
    hp += profile.modifiers.hp;
    for (const [index, modifier] of (profile.hostModifiers ?? []).entries()) {
      const derived = evaluate(
        evaluation,
        `host-modifier:${upgrade.instanceId}:${upgrade.incarnation}:${index}`,
        next => {
          if (
            !abilityOrigins(state, upgrade, next).some(o => o.id === 'self' && !o.suppressed) ||
            !conditionMatches(
              state,
              upgrade.controller,
              modifier.condition,
              { source: upgrade },
              next,
            )
          )
            return;
          return {
            power: numericValue(state, { source: upgrade }, modifier.power ?? 0, next),
            hp: numericValue(state, { source: upgrade }, modifier.hp ?? 0, next),
          };
        },
      );
      power += derived?.power ?? 0;
      hp += derived?.hp ?? 0;
    }
  }
  for (const [index, modifier] of state.phaseStatModifiers.entries()) {
    const applies = evaluate(evaluation, `phase-stat:${index}:${unit.instanceId}`, next =>
      matchesUnit(
        state,
        unit,
        modifier.playerId,
        modifier.filter,
        { source: modifier.source },
        next,
      ),
    );
    if (applies) {
      power += modifier.power;
      hp += modifier.hp;
    }
  }
  const abilities = effectiveAbilities(state, unit, evaluation);
  power += abilities.powerModifier ?? 0;
  hp += abilities.hpModifier ?? 0;
  for (const effect of activeLasting(state, unit)) {
    power += effect.power;
    hp += effect.hp;
  }
  for (const attack of state.attacks) {
    if (
      attack.attacker.instanceId === unit.instanceId &&
      attack.attacker.incarnation === unit.incarnation &&
      !attack.removedFromCombat.some(
        ref => ref.instanceId === unit.instanceId && ref.incarnation === unit.incarnation,
      )
    )
      power += attack.powerBonus;
  }
  if (
    state.attacks.some(
      attack =>
        attack.attacker.instanceId === unit.instanceId &&
        attack.attacker.incarnation === unit.incarnation &&
        !attack.removedFromCombat.some(
          ref => ref.instanceId === unit.instanceId && ref.incarnation === unit.incarnation,
        ),
    )
  )
    power += abilities.raid ?? 0;
  if (abilities.keywords?.includes('Grit')) power += unit.damage;
  return { power: Math.max(0, power), hp: Math.max(0, hp) };
}
// Eligibility is evaluated when attaching, not continuously (v8 §3.6.3).
export function canAttach(state: GameState, upgrade: CardInstance, unit: CardInstance): boolean {
  const profile = upgradeProfile(cardDefinition(state, upgrade.cardId));
  if (!profile || !isUnit(state, unit) || unit.instanceId === upgrade.instanceId) return false;
  if (upgrade.attachmentRestriction?.kind === 'filter') {
    const filter = upgrade.attachmentRestriction.filter;
    return (
      matchesUnit(
        state,
        unit,
        upgrade.controller,
        { ...filter, withoutPilot: undefined },
        { source: upgrade },
      ) &&
      (!filter.withoutPilot ||
        !attachedUpgrades(state, unit).some(
          card =>
            card.instanceId !== upgrade.instanceId && cardTraits(state, card).includes('Pilot'),
        ))
    );
  }
  if (upgrade.attachmentRestriction)
    return (
      unit.instanceId === upgrade.attachmentRestriction.host.instanceId &&
      unit.incarnation === upgrade.attachmentRestriction.host.incarnation
    );
  if (cardDefinition(state, upgrade.cardId).kind === 'upgrade' && namedAbilityLoss(state, upgrade))
    return true;
  if (
    profile.attachFilter &&
    !matchesUnit(state, unit, upgrade.controller, profile.attachFilter, { source: upgrade })
  )
    return false;
  if (profile.attachTo === 'unit') return true;
  if (profile.attachTo === 'friendly-unit') return unit.controller === upgrade.controller;
  if (profile.attachTo === 'non-vehicle') return !cardTraits(state, unit).includes('Vehicle');
  return (
    unit.controller === upgrade.controller &&
    cardTraits(state, unit).includes('Vehicle') &&
    ((profile.ignorePilotLimit &&
      !namedAbilityLoss(state, upgrade) &&
      !activeLasting(state, upgrade).some(e => e.loseAbilities)) ||
      attachedUpgrades(state, unit).filter(
        card => card.instanceId !== upgrade.instanceId && cardTraits(state, card).includes('Pilot'),
      ).length <
        1 + (effectiveAbilities(state, unit).extraPilotSlots ?? 0))
  );
}
export function unitKeywords(state: GameState, unit: CardInstance, evaluation?: Evaluation) {
  return effectiveAbilities(state, unit, evaluation).keywords ?? [];
}
export function attach(state: GameState, upgrade: CardInstance, unit: CardInstance, notify = true) {
  if (!canAttach(state, upgrade, unit)) throw new Error('Invalid attachment');
  // Role conversion performs its cleanup before reaching this attachment boundary.
  if (isUnit(state, upgrade)) throw new Error('In-play unit conversion is unsupported');
  if (
    upgrade.attachedTo &&
    (upgrade.attachedTo.instanceId !== unit.instanceId ||
      upgrade.attachedTo.incarnation !== unit.incarnation)
  ) {
    const previous = state.cards[upgrade.attachedTo.instanceId];
    if (previous && previous.incarnation === upgrade.attachedTo.incarnation)
      collectTriggers(state, 'detached', [upgrade], previous);
  }
  move(state, upgrade, unit.zone);
  upgrade.attachedTo = { instanceId: unit.instanceId, incarnation: unit.incarnation };
  upgrade.exhausted = false;
  const definition = cardDefinition(state, upgrade.cardId);
  if (definition.kind === 'upgrade' && definition.token)
    upgrade.owner = upgrade.controller = unit.controller;
  fact(state, 'attached', upgrade.controller, [upgrade, unit]);
  if (notify) {
    collectTriggers(state, 'attached', [upgrade], unit);
    collectTriggers(state, 'upgrades-attached', [unit]);
    if (cardTraits(state, upgrade).includes('Pilot'))
      collectTriggers(state, 'pilot-attached', [unit], upgrade);
  }
}
export function giveTokens(
  state: GameState,
  unit: CardInstance,
  token: 'shield' | 'experience' | 'advantage',
  count: number,
  creator = unit.controller,
  notify = true,
) {
  if (!isUnit(state, unit) || count <= 0) return;
  for (let n = 0; n < count; n++) {
    const upgrade = addCard(state, unit.controller, token, 'set-aside');
    attach(state, upgrade, unit, false);
    recordTokenCreation(state, creator);
  }
  if (notify) collectTriggers(state, 'upgrades-attached', [unit]);
}
export function giveToken(
  state: GameState,
  unit: CardInstance,
  token: 'shield' | 'experience' | 'advantage',
  creator = unit.controller,
) {
  giveTokens(state, unit, token, 1, creator);
}
export type AbilityObserver = { source: CardInstance; origins: AbilityOrigin[] };
export function captureObservers(state: GameState): AbilityObserver[] {
  return abilitySources(state).map(source => ({
    source: structuredClone(source),
    origins: abilityOrigins(state, source),
  }));
}
export function defeatUpgrade(
  state: GameState,
  card: CardInstance,
  observers = captureObservers(state),
  source?: CardInstance,
) {
  if (!isUpgrade(state, card) || !canAffectWithAbility(state, card, source, 'defeat')) return false;
  if (deferUpgradeDefeat(state, card, observers)) return true;
  commitUpgradeDefeat(state, card, observers);
  return true;
}
export function commitUpgradeDefeat(
  state: GameState,
  card: CardInstance,
  observers: AbilityObserver[],
  origins?: AbilityOrigin[],
) {
  if (!state.phaseHistory.upgradesDefeated.includes(card.controller))
    state.phaseHistory.upgradesDefeated.push(card.controller);
  collectTriggers(state, 'defeated', [card], undefined, origins ? { origins } : {});
  for (const observer of observers)
    if (observer.source.controller === card.controller)
      collectTriggers(state, 'friendly-upgrade-defeated', [observer.source], card, {
        origins: observer.origins,
      });
  fact(state, 'defeated', card.controller, [card]);
  if (cardDefinition(state, card.cardId).kind === 'leader') {
    move(state, card, 'base');
    card.deployedAs = null;
    card.exhausted = true;
    card.damage = 0;
  } else move(state, card, 'discard');
  return true;
}
export function defeatUpgrades(state: GameState, cards: CardInstance[], source?: CardInstance) {
  if (!cards.length) return [];
  const observers = captureObservers(state);
  const eligible = cards.filter(card => canAffectWithAbility(state, card, source, 'defeat'));
  // One simultaneous instruction fixes protection before removing its first attachment.
  return eligible.filter(card => defeatUpgrade(state, card, observers));
}
export function reattachmentTargets(state: GameState, upgrade: CardInstance): CardInstance[] {
  return [...state.ground, ...state.space]
    .map(id => instance(state, id))
    .filter(
      unit => unit.instanceId !== upgrade.attachedTo?.instanceId && canAttach(state, upgrade, unit),
    );
}
export function orphanUpgrades(state: GameState) {
  return [...state.ground, ...state.space]
    .map(id => instance(state, id))
    .filter(card => {
      if (!isUpgrade(state, card)) return false;
      const parent = card.attachedTo && state.cards[card.attachedTo.instanceId];
      return (
        !parent || !isUnit(state, parent) || parent.incarnation !== card.attachedTo!.incarnation
      );
    });
}

// Read the live incarnation first, otherwise its departure statistics (v8 §8.11).
// A later return of the same physical card cannot overwrite an older ability's power.
export function sourcePower(
  state: GameState,
  source: CardReference,
  evaluation?: Evaluation,
): number {
  const card = instance(state, source.instanceId);
  if (card.incarnation === source.incarnation && isUnit(state, card))
    return unitStats(state, card, evaluation).power;
  if (card.incarnation === source.incarnation && isUpgrade(state, card)) return 0;
  if (
    state.departedUpgrades.some(
      entry =>
        entry.reference.instanceId === source.instanceId &&
        entry.reference.incarnation === source.incarnation,
    )
  )
    return 0;
  const previous = state.departedUnits.find(
    entry =>
      entry.reference.instanceId === source.instanceId &&
      entry.reference.incarnation === source.incarnation,
  );
  if (!previous) throw new Error('Missing source power history');
  return previous.power;
}
