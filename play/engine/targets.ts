import { conditionMatches } from './conditions.ts';
import { cardPrintedTitle } from './identity.ts';
import { cardAspects } from './identity.ts';
import { defeatedAbilityChoices } from './triggers.ts';
import { numericValue } from './values.ts';
import { cardTitle } from '../cards/catalog.ts';
import { cardTraits, unitIsLeader } from './attributes.ts';
import type { Evaluation } from './evaluation.ts';
import { keywordNames, effectiveAbilities } from './effective-abilities.ts';
import { printedCost } from './inspection.ts';
import { boundUnit, boundReference, boundArena, type EffectContext } from './bindings.ts';
import { sourcePower } from './attachments.ts';
import type { UnitFilter } from '../cards/definition.ts';
import { cardDefinition } from '../cards/catalog.ts';
import { attachedUpgrades, isUnit, unitStats } from './attachments.ts';
import type { CardInstance, GameState } from './model.ts';

// Resolve current attributes at the choice, never against a catalog-name match.
export function matchesUnit(
  state: GameState,
  card: CardInstance,
  playerId: string,
  filter: UnitFilter = {},
  context?: EffectContext,
  evaluation?: Evaluation,
): boolean {
  if (!isUnit(state, card)) return false;
  const definition = cardDefinition(state, card.cardId);
  const traits =
    filter.trait ||
    filter.withoutTrait ||
    filter.anyTrait ||
    filter.sharesFriendlyLeaderTrait ||
    filter.sharesTraitWithGroup
      ? cardTraits(state, card, evaluation)
      : [];
  const remaining =
    filter.remainingHpAtLeast !== undefined || filter.remainingHpAtMost !== undefined
      ? unitStats(state, card, evaluation).hp - card.damage
      : 0;
  const cost =
    definition.kind === 'leader'
      ? (definition.printedCost ?? 0)
      : definition.kind === 'unit'
        ? definition.cost
        : 0;
  const same = filter.sameAs && boundReference(context, filter.sameAs, state);
  const other = filter.otherThan && boundReference(context, filter.otherThan, state);
  const arena = filter.sameArenaAs && context && boundArena(state, context, filter.sameArenaAs);
  const powerRef = filter.powerLessThan && boundReference(context, filter.powerLessThan);
  const ceiling =
    filter.powerLessThan === 'any-friendly'
      ? Math.max(
          0,
          ...[...state.ground, ...state.space]
            .map(id => state.cards[id]!)
            .filter(c => isUnit(state, c) && c.controller === playerId)
            .map(c => unitStats(state, c, evaluation).power),
        )
      : powerRef
        ? sourcePower(state, powerRef, evaluation)
        : 0;
  const powerLimit =
    filter.remainingHpLessThanPower &&
    boundReference(context, filter.remainingHpLessThanPower, state);
  const hpUnit =
    filter.remainingHpLessThan && context && boundUnit(state, context, filter.remainingHpLessThan);
  const cheaper = filter.costGreaterThan && boundReference(context, filter.costGreaterThan, state);
  const defended = filter.attackingUnit
    ? boundReference(context, filter.attackingUnit, state)
    : undefined;
  // Resolve exact-copy exclusions before derived attributes to avoid querying
  // a card's own conditional keyword while checking another unit.
  return (
    (!filter.otherThan ||
      (!!other &&
        (card.instanceId !== other.instanceId || card.incarnation !== other.incarnation))) &&
    (!filter.controller || (card.controller === playerId) === (filter.controller === 'friendly')) &&
    (!filter.sharesTraitWithGroup ||
      !!context?.groups?.[filter.sharesTraitWithGroup]?.some(ref =>
        cardTraits(state, ref, evaluation).some(t => traits.includes(t)),
      )) &&
    (filter.powerEquals === undefined ||
      (!!context &&
        unitStats(state, card, evaluation).power ===
          numericValue(state, context, filter.powerEquals, evaluation))) &&
    (filter.remainingHpEquals === undefined ||
      (!!context &&
        unitStats(state, card, evaluation).hp - card.damage ===
          numericValue(state, context, filter.remainingHpEquals, evaluation))) &&
    (filter.damagedThisPhase === undefined ||
      state.phaseHistory.damagedUnits.some(
        ref => ref.instanceId === card.instanceId && ref.incarnation === card.incarnation,
      ) === filter.damagedThisPhase) &&
    (!filter.condition ||
      conditionMatches(
        state,
        playerId,
        filter.condition,
        context ?? { source: card },
        evaluation,
      )) &&
    (filter.hasBounty === undefined ||
      !!effectiveAbilities(state, card).bounties?.length === filter.hasBounty) &&
    (!filter.sameNameAs ||
      (!!boundReference(context, filter.sameNameAs, state) &&
        cardPrintedTitle(state, card) ===
          cardPrintedTitle(state, boundReference(context, filter.sameNameAs, state)!))) &&
    (filter.costLessThan === undefined ||
      (!!context && cost < numericValue(state, context, filter.costLessThan, evaluation))) &&
    (!filter.upgradeTrait ||
      attachedUpgrades(state, card).some(u =>
        cardTraits(state, u, evaluation).includes(filter.upgradeTrait!),
      )) &&
    (!filter.attacking ||
      state.attacks.some(
        a =>
          a.attacker.instanceId === card.instanceId &&
          a.attacker.incarnation === card.incarnation &&
          !a.removedFromCombat.some(
            r => r.instanceId === card.instanceId && r.incarnation === card.incarnation,
          ) &&
          (filter.attacking === 'any' ||
            (cardDefinition(state, a.defender.cardId).kind === 'base') ===
              (filter.attacking === 'base')),
      )) &&
    (!filter.attackingAgainst ||
      state.attacks.some(a => {
        if (
          a.attacker.instanceId !== card.instanceId ||
          a.attacker.incarnation !== card.incarnation ||
          a.removedFromCombat.some(
            r => r.instanceId === a.attacker.instanceId || r.instanceId === a.defender.instanceId,
          )
        )
          return false;
        const defender = state.cards[a.defender.instanceId];
        return (
          !!defender &&
          defender.incarnation === a.defender.incarnation &&
          matchesUnit(state, defender, playerId, filter.attackingAgainst!, context, evaluation)
        );
      })) &&
    (!filter.defendingAgainst ||
      state.attacks.some(a => {
        if (
          a.defender.instanceId !== card.instanceId ||
          a.defender.incarnation !== card.incarnation ||
          a.removedFromCombat.some(
            r => r.instanceId === card.instanceId || r.instanceId === a.attacker.instanceId,
          )
        )
          return false;
        const attacker = state.cards[a.attacker.instanceId];
        return (
          !!attacker &&
          attacker.incarnation === a.attacker.incarnation &&
          matchesUnit(state, attacker, playerId, filter.defendingAgainst, context, evaluation)
        );
      })) &&
    (!filter.differentArenaFrom ||
      (!!context &&
        !!boundArena(state, context, filter.differentArenaFrom) &&
        card.zone !== boundArena(state, context, filter.differentArenaFrom))) &&
    (!filter.mostCostAmong ||
      matchingUnits(state, playerId, filter.mostCostAmong, context, evaluation).every(
        other => printedCost(state, card) >= printedCost(state, other),
      )) &&
    (!filter.mostPowerAmong ||
      matchingUnits(state, playerId, filter.mostPowerAmong, context, evaluation).every(
        other =>
          unitStats(state, card, evaluation).power >= unitStats(state, other, evaluation).power,
      )) &&
    (!filter.owner || (card.owner === playerId) === (filter.owner === 'self')) &&
    (filter.costEquals === undefined ||
      (!!context && cost === numericValue(state, context, filter.costEquals, evaluation))) &&
    (filter.damageAtLeast === undefined || card.damage >= filter.damageAtLeast) &&
    (filter.playedThisPhase === undefined ||
      state.phaseHistory.played.some(
        play =>
          play.playerId === playerId &&
          isUnit(state, play.card) &&
          play.card.instanceId === card.instanceId &&
          play.card.incarnation === card.incarnation,
      ) === filter.playedThisPhase) &&
    (filter.whenDefeated === undefined ||
      defeatedAbilityChoices(state, card).length > 0 === filter.whenDefeated) &&
    (!filter.notInGroup ||
      !context?.groups?.[filter.notInGroup]?.some(
        ref => ref.instanceId === card.instanceId && ref.incarnation === card.incarnation,
      )) &&
    (!filter.inGroup ||
      !!context?.groups?.[filter.inGroup]?.some(
        ref => ref.instanceId === card.instanceId && ref.incarnation === card.incarnation,
      )) &&
    (filter.minKeywords === undefined ||
      keywordNames(state, card, evaluation).length >= filter.minKeywords) &&
    (!filter.sharesNoAspectWithGroup ||
      (!!context?.groups?.[filter.sharesNoAspectWithGroup]?.length &&
        context.groups[filter.sharesNoAspectWithGroup]!.every(
          ref => !cardAspects(state, ref).some(a => cardAspects(state, card).includes(a)),
        ))) &&
    (!filter.otherThanAny ||
      filter.otherThanAny.every(key => {
        const ref = boundReference(context, key, state);
        return ref?.instanceId !== card.instanceId || ref.incarnation !== card.incarnation;
      })) &&
    (!filter.anyOf ||
      filter.anyOf.some(f => matchesUnit(state, card, playerId, f, context, evaluation))) &&
    (!filter.attackingUnit ||
      state.attacks.some(
        a =>
          a.attacker.instanceId === card.instanceId &&
          a.attacker.incarnation === card.incarnation &&
          a.defender.instanceId === defended?.instanceId &&
          a.defender.incarnation === defended?.incarnation &&
          !a.removedFromCombat.some(
            r => r.instanceId === card.instanceId || r.instanceId === defended?.instanceId,
          ),
      )) &&
    (filter.enteredThisPhase === undefined ||
      state.phaseHistory.entered.some(
        r => r.instanceId === card.instanceId && r.incarnation === card.incarnation,
      ) === filter.enteredThisPhase) &&
    (!filter.withUpgrade ||
      attachedUpgrades(state, card).some(u => u.cardId === filter.withUpgrade)) &&
    (!filter.sharesFriendlyLeaderTrait ||
      Object.values(state.cards).some(
        leader =>
          leader.controller === playerId &&
          ['base', 'ground', 'space'].includes(leader.zone) &&
          (cardDefinition(state, leader.cardId).kind === 'leader' ||
            (isUnit(state, leader) && unitIsLeader(state, leader, evaluation))) &&
          cardTraits(state, leader, evaluation).some(t => traits.includes(t)),
      )) &&
    (!filter.sameAs ||
      (!!same && same.instanceId === card.instanceId && same.incarnation === card.incarnation)) &&
    (!filter.withoutUpgrade ||
      !attachedUpgrades(state, card).some(upgrade => upgrade.cardId === filter.withoutUpgrade)) &&
    (filter.attackedThisPhase === undefined ||
      state.phaseHistory.attacks.some(
        ref => ref.instanceId === card.instanceId && ref.incarnation === card.incarnation,
      ) === filter.attackedThisPhase) &&
    (filter.defending === undefined ||
      state.attacks.some(
        attack =>
          attack.defender.instanceId === card.instanceId &&
          attack.defender.incarnation === card.incarnation &&
          !attack.removedFromCombat.some(
            ref => ref.instanceId === card.instanceId && ref.incarnation === card.incarnation,
          ),
      ) === filter.defending) &&
    (!filter.remainingHpLessThanPower ||
      (!!powerLimit &&
        unitStats(state, card, evaluation).hp - card.damage <
          sourcePower(state, powerLimit, evaluation))) &&
    (!filter.remainingHpLessThan ||
      (!!hpUnit &&
        isUnit(state, hpUnit) &&
        unitStats(state, card, evaluation).hp - card.damage <
          unitStats(state, hpUnit, evaluation).hp - hpUnit.damage)) &&
    (!filter.withoutPilot ||
      !attachedUpgrades(state, card).some(upgrade =>
        cardTraits(state, upgrade).includes('Pilot'),
      )) &&
    (filter.dealtBaseDamage === undefined ||
      state.phaseHistory.baseDamageSources.some(
        r => r.instanceId === card.instanceId && r.incarnation === card.incarnation,
      ) === filter.dealtBaseDamage) &&
    (!filter.hasKeyword || keywordNames(state, card, evaluation).includes(filter.hasKeyword)) &&
    (filter.powerAtLeast === undefined ||
      unitStats(state, card, evaluation).power >= filter.powerAtLeast) &&
    (!filter.costGreaterThan || (!!cheaper && cost > printedCost(state, cheaper))) &&
    (!filter.anyAspect || filter.anyAspect.some(a => definition.aspects.includes(a))) &&
    (filter.leader === undefined || unitIsLeader(state, card, evaluation) === filter.leader) &&
    (!filter.excludeName || cardTitle(state, card.cardId) !== filter.excludeName) &&
    (!filter.name || cardTitle(state, card.cardId) === filter.name) &&
    (filter.powerAtMost === undefined ||
      unitStats(state, card, evaluation).power <= filter.powerAtMost) &&
    (!filter.powerAtMostUnit ||
      (!!context &&
        !!boundReference(context, filter.powerAtMostUnit, state) &&
        unitStats(state, card, evaluation).power <=
          sourcePower(
            state,
            boundReference(context, filter.powerAtMostUnit, state)!,
            evaluation,
          ))) &&
    (!filter.otherThan ||
      (!!other &&
        (card.instanceId !== other.instanceId || card.incarnation !== other.incarnation))) &&
    (!filter.sameArenaAs || (!!arena && card.zone === arena)) &&
    (!filter.powerLessThan || unitStats(state, card, evaluation).power < ceiling) &&
    (filter.unique === undefined || !!definition.unique === filter.unique) &&
    (filter.token === undefined ||
      (definition.kind === 'unit' && definition.token === true) === filter.token) &&
    (!filter.anyTrait || filter.anyTrait.some(trait => traits.includes(trait))) &&
    (!filter.withoutTrait || !traits.includes(filter.withoutTrait)) &&
    (filter.exhausted === undefined || card.exhausted === filter.exhausted) &&
    (!filter.arena || card.zone === filter.arena) &&
    (!filter.controller || (card.controller === playerId) === (filter.controller === 'friendly')) &&
    (!filter.nonLeader || !unitIsLeader(state, card, evaluation)) &&
    (!filter.trait || traits.includes(filter.trait)) &&
    (filter.maxCost === undefined ||
      cost <=
        numericValue(
          state,
          context ?? { source: { ...card, controller: playerId } },
          filter.maxCost,
          evaluation,
        )) &&
    (filter.remainingHpAtLeast === undefined || remaining >= filter.remainingHpAtLeast) &&
    (filter.remainingHpAtMost === undefined || remaining <= filter.remainingHpAtMost) &&
    (filter.damaged === undefined || card.damage > 0 === filter.damaged) &&
    (filter.upgraded === undefined || attachedUpgrades(state, card).length > 0 === filter.upgraded)
  );
}
export function matchingUnits(
  state: GameState,
  playerId: string,
  filter: UnitFilter,
  context?: EffectContext,
  evaluation?: Evaluation,
) {
  return [...state.ground, ...state.space]
    .map(id => state.cards[id]!)
    .filter(card => matchesUnit(state, card, playerId, filter, context, evaluation));
}
