import { effectiveAbilities, mayHaveAbility } from './effective-abilities.ts';
import { isUnit, unitStats, attachedUpgrades } from './attachments.ts';
import { upgradeProfile } from './roles.ts';
import { cardDefinition } from '../cards/catalog.ts';
import { namedAbilityLoss } from './naming.ts';
import { attackOverrides } from './attack-restrictions.ts';
import type { UnitOperation } from '../cards/definition.ts';
import { simpleAbilitiesSchema, type CardInstance, type GameState } from './model.ts';
import { allocateId, fact, reference } from './state.ts';
export function activeLasting(state: GameState, unit: CardInstance) {
  return state.lastingEffects.filter(
    effect =>
      effect.target.instanceId === unit.instanceId &&
      effect.target.incarnation === unit.incarnation &&
      (effect.expires.kind !== 'source-in-play' ||
        (state.cards[effect.source.instanceId]?.incarnation === effect.source.incarnation &&
          ['base', 'ground', 'space'].includes(state.cards[effect.source.instanceId]!.zone))),
  );
}
export function modifyUnit(
  state: GameState,
  source: CardInstance,
  unit: CardInstance,
  operation: Omit<Extract<UnitOperation, { kind: 'modify' }>, 'power' | 'hp'> & {
    power: number;
    hp: number;
  },
) {
  const attackId = state.attacks.at(-1)?.id;
  if (operation.duration === 'attack' && !attackId) return;
  if (state.phase !== 'action' && state.phase !== 'regroup') return;
  state.lastingEffects.push({
    id: allocateId(state, 'm'),
    source: structuredClone(source),
    target: reference(unit),
    ...(operation.printedPower !== undefined ? { printedPower: operation.printedPower } : {}),
    ...(operation.printedHp !== undefined ? { printedHp: operation.printedHp } : {}),
    power: operation.power,
    hp: operation.hp,
    loseAbilities: operation.loseAbilities ?? false,
    ...(operation.loseKeywords ? { loseKeywords: true } : {}),
    ...(operation.lostKeywords ? { lostKeywords: [...operation.lostKeywords] } : {}),
    ...(operation.loseTraits ? { loseTraits: [...operation.loseTraits] } : {}),
    ...(operation.cannotReady ? { cannotReady: true } : {}),
    ...(operation.cannotAttackBases ? { cannotAttackBases: true } : {}),
    ...(operation.cannotBeAttacked ? { cannotBeAttacked: true } : {}),
    ...(operation.cannotDealCombatDamage ? { cannotDealCombatDamage: true } : {}),
    ...(operation.cannotHeal ? { cannotHeal: true } : {}),
    ...(operation.surviveZeroHp ? { surviveZeroHp: true } : {}),
    ...(operation.preventAllDamage ? { preventAllDamage: true } : {}),
    ...(operation.preventNextDamage ? { preventNextDamage: operation.preventNextDamage } : {}),
    ...(operation.skipRegroupReady ? { skipRegroupReady: true } : {}),
    ...(operation.abilities ? { abilities: simpleAbilitiesSchema.parse(operation.abilities) } : {}),
    expires:
      operation.duration === 'round'
        ? { kind: 'round', round: state.round }
        : operation.duration === 'next-regroup'
          ? { kind: 'next-regroup', round: state.round + (state.phase === 'regroup' ? 1 : 0) }
          : operation.duration === 'attack'
            ? { kind: 'attack', attackId: attackId! }
            : operation.duration === 'source-in-play'
              ? { kind: 'source-in-play' }
              : { kind: 'phase', phase: state.phase, round: state.round },
  });
  fact(state, 'modified', source.controller, [source, unit]);
}

export function losesOwnAbilities(state: GameState, card: CardInstance) {
  return namedAbilityLoss(state, card) || activeLasting(state, card).some(e => e.loseAbilities);
}
export function cannotGainAbilities(state: GameState, unit: CardInstance) {
  return (
    namedAbilityLoss(state, unit) ||
    !!attackOverrides(state, unit).length ||
    activeLasting(state, unit).some(effect => effect.loseAbilities)
  );
}

export function cannotGainKeywords(state: GameState, unit: CardInstance) {
  return (
    cannotGainAbilities(state, unit) ||
    activeLasting(state, unit).some(effect => effect.loseKeywords)
  );
}
export function cannotReady(state: GameState, unit: CardInstance, duringRegroup = false) {
  const threshold =
    duringRegroup && mayHaveAbility(state, unit, 'regroupReadyPower')
      ? (effectiveAbilities(state, unit).regroupReadyPower ?? 0)
      : 0;
  return (
    (threshold > 0 && isUnit(state, unit) && unitStats(state, unit).power < threshold) ||
    (mayHaveAbility(state, unit, 'cannotReady') && !!effectiveAbilities(state, unit).cannotReady) ||
    activeLasting(state, unit).some(
      effect =>
        effect.cannotReady ||
        (duringRegroup &&
          effect.skipRegroupReady &&
          effect.expires.kind === 'next-regroup' &&
          effect.expires.round === state.round),
    ) ||
    attachedUpgrades(state, unit).some(
      upgrade =>
        !losesOwnAbilities(state, upgrade) &&
        upgradeProfile(cardDefinition(state, upgrade.cardId))?.hostCannotReady,
    )
  );
}

export function survivesZeroHp(state: GameState, unit: CardInstance) {
  return (
    (mayHaveAbility(state, unit, 'surviveZeroHp') &&
      effectiveAbilities(state, unit).surviveZeroHp) ||
    activeLasting(state, unit).some(effect => effect.surviveZeroHp)
  );
}
