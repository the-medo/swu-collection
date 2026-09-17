import type { CatalogContext } from '../cards/catalog.ts';
import { scheduledDefinition } from './scheduled-definition.ts';
import { smuggleOptions } from './smuggle.ts';
import { historicalOwnerMatches } from './roles.ts';
import { namedAbilityLoss } from './naming.ts';
import { cardTraits } from './attributes.ts';
import { losesAttackingOverwhelm, attackOverrides } from './attack-restrictions.ts';
import { conditionMatches } from './conditions.ts';
import { activeLasting, losesOwnAbilities } from './lasting.ts';
import type { Abilities } from '../cards/definition.ts';
import { cardDefinition } from '../cards/catalog.ts';
import { activeAbilities } from './abilities.ts';
import { attachedUpgrades, isUnit } from './attachments.ts';
import type { AbilityOrigin, CardInstance, GameState } from './model.ts';
import { isUpgrade, upgradeProfile } from './roles.ts';
import { allocateId, reference } from './state.ts';
import { evaluate, type Evaluation } from './evaluation.ts';
import { numericValue } from './values.ts';
import { matchesUnit } from './targets.ts';

export function originAbilities(
  state: CatalogContext,
  origin: AbilityOrigin,
): Abilities | undefined {
  if (origin.gritOnly)
    return {
      keywords:
        originAbilities(state, { ...origin, gritOnly: undefined })?.keywords?.filter(
          k => k === 'Grit',
        ) ?? [],
    };
  if (origin.profile === 'attack-grant') {
    const card = cardDefinition(state, origin.card.cardId);
    return { triggers: card.kind === 'event' ? (card.attackGrants ?? []) : [] };
  }
  if (origin.profile === 'attack-override')
    return {
      triggers: upgradeProfile(cardDefinition(state, origin.card.cardId))?.attackOverride ?? [],
    };
  if (origin.profile === 'scheduled') {
    const effect = scheduledDefinition(state, origin.card, origin.scheduledId);
    return {
      triggers: [
        {
          id: effect.id,
          timing: effect.timing,
          optional: effect.optional,
          effects: effect.effects,
        },
      ],
    };
  }
  if (origin.profile === 'lasting') return origin.abilities;
  if (origin.profile === 'printed' || origin.profile === 'discarded-unit')
    return activeAbilities(state, origin.card);
  if (origin.profile === 'aura')
    return auraDefinitions(state, origin).find(a => a.id === origin.auraId)?.abilities ?? {};
  return upgradeProfile(cardDefinition(state, origin.card.cardId))?.grants;
}
function auraDefinitions(state: CatalogContext, origin: AbilityOrigin) {
  return (
    (origin.auraProfile === 'granted'
      ? upgradeProfile(cardDefinition(state, origin.card.cardId))?.grants?.auras
      : activeAbilities(state, origin.card).auras) ?? []
  );
}
function baseOrigins(
  state: GameState,
  card: CardInstance,
  evaluation?: Evaluation,
): AbilityOrigin[] {
  const origins: AbilityOrigin[] = [
    { id: 'self', card: structuredClone(card), profile: 'printed', withoutSupport: false },
  ];
  if (isUnit(state, card) || cardDefinition(state, card.cardId).kind === 'base') {
    for (const upgrade of attachedUpgrades(state, card)) {
      const profile = upgradeProfile(cardDefinition(state, upgrade.cardId));
      if (
        profile?.grants &&
        !losesOwnAbilities(state, upgrade) &&
        (!profile.grantsCondition ||
          conditionMatches(
            state,
            upgrade.controller,
            profile.grantsCondition,
            { source: upgrade },
            evaluation,
          )) &&
        (!profile.grantsIf || cardTraits(state, card, evaluation).includes(profile.grantsIf.trait))
      )
        origins.push({
          id: `attached-${upgrade.instanceId}`,
          card: structuredClone(upgrade),
          profile: 'granted',
          withoutSupport: false,
        });
    }
    for (const attack of state.attacks)
      if (
        attack.attacker.instanceId === card.instanceId &&
        attack.attacker.incarnation === card.incarnation &&
        !attack.removedFromCombat.some(
          ref => ref.instanceId === card.instanceId && ref.incarnation === card.incarnation,
        )
      )
        origins.push(...structuredClone(attack.grantedAbilities));
  }
  const overrides = attackOverrides(state, card);
  if (overrides.length) {
    for (const origin of origins) origin.suppressed = true;
    for (const upgrade of overrides)
      origins.push({
        id: `override-${upgrade.instanceId}`,
        card: structuredClone(upgrade),
        profile: 'attack-override',
        withoutSupport: false,
      });
  }
  const effects = activeLasting(state, card);
  for (const effect of effects)
    if (effect.abilities)
      origins.push({
        id: effect.id,
        card: structuredClone(effect.source),
        profile: 'lasting',
        withoutSupport: false,
        abilities: structuredClone(effect.abilities),
      });
  if (isUnit(state, card))
    for (const grant of state.keywordGrants) {
      const current = state.cards[grant.source.instanceId];
      if (
        current?.incarnation === grant.source.incarnation &&
        ['ground', 'space'].includes(current.zone) &&
        card.controller === grant.playerId &&
        evaluate(
          evaluation,
          `keyword-grant:${grant.id}:${card.instanceId}:${card.incarnation}`,
          next => cardTraits(state, card, next).includes(grant.trait),
        )
      )
        origins.push({
          id: grant.id,
          card: structuredClone(grant.source),
          profile: 'lasting',
          withoutSupport: false,
          abilities: structuredClone(grant.abilities),
        });
    }
  if (namedAbilityLoss(state, card) || effects.some(effect => effect.loseAbilities))
    for (const origin of origins) origin.suppressed = true;
  if (card.cardId === 'credit' || card.cardId === 'advantage') {
    const host = card.attachedTo && state.cards[card.attachedTo.instanceId];
    const blanked = Object.values(state.cards).some(
      source =>
        isUnit(state, source) &&
        baseOrigins(state, source, evaluation).some(origin => {
          if (origin.suppressed) return false;
          const abilities = originAbilities(state, origin);
          return card.cardId === 'credit'
            ? source.controller !== card.controller && abilities?.blankEnemyCredits
            : host && source.controller === host.controller && abilities?.blankFriendlyAdvantages;
        }),
    );
    if (blanked) for (const origin of origins) origin.suppressed = true;
  }
  restrictToGrit(state, card, origins);
  return origins;
}
function restrictToGrit(state: GameState, card: CardInstance, origins: AbilityOrigin[]) {
  if (
    !isUnit(state, card) ||
    !attachedUpgrades(state, card).some(
      u =>
        upgradeProfile(cardDefinition(state, u.cardId))?.hostOnlyGrit &&
        !losesOwnAbilities(state, u),
    )
  )
    return;
  for (const origin of origins) {
    origin.gritOnly = true;
    if (origin.resolved)
      origin.resolved = {
        abilities: {
          keywords: origin.resolved.abilities.keywords?.filter(k => k === 'Grit') ?? [],
        },
        losesKeywords: origin.resolved.losesKeywords,
        power: 0,
        hp: 0,
      };
  }
}
function auraHosts(state: GameState): CardInstance[] {
  const hosts = new Set<string>();
  for (const card of Object.values(state.cards)) {
    if (!['base', 'ground', 'space'].includes(card.zone)) continue;
    if (activeAbilities(state, card).auras?.length) hosts.add(card.instanceId);
    if (
      card.attachedTo &&
      upgradeProfile(cardDefinition(state, card.cardId))?.grants?.auras?.length
    )
      hosts.add(card.attachedTo.instanceId);
  }
  for (const attack of state.attacks)
    if (attack.grantedAbilities.some(origin => originAbilities(state, origin)?.auras?.length))
      hosts.add(attack.attacker.instanceId);
  return [...hosts].map(id => state.cards[id]!);
}
// Each derived ability keeps its printed origin. Evaluation dependencies are
// scoped to this query; an unsupported cycle cannot make its own condition true.
export function abilityOrigins(
  state: GameState,
  card: CardInstance,
  evaluation?: Evaluation,
): AbilityOrigin[] {
  const origins = baseOrigins(state, card, evaluation);
  for (const origin of origins) {
    const profile = originAbilities(state, origin);
    if (origin.suppressed || !profile?.constant) continue;
    const resolved: NonNullable<AbilityOrigin['resolved']> = {
      abilities: {
        keywords: [] as NonNullable<Abilities['keywords']>[number][],
        firstCombatDamage: false,
        defenderCombatFirst: false,
      },
      losesKeywords: [] as string[],
      power: 0,
      hp: 0,
    };
    for (const [index, constant] of profile.constant.entries()) {
      const value = evaluate(
        evaluation,
        `constant:${card.instanceId}:${card.incarnation}:${origin.id}:${index}`,
        next => {
          if (!conditionMatches(state, card.controller, constant.condition, { source: card }, next))
            return;
          return {
            keywords: [...(constant.abilities?.keywords ?? [])],
            raid:
              constant.raid !== undefined || constant.abilities?.raid !== undefined
                ? (constant.abilities?.raid ?? 0) +
                  numericValue(state, { source: card }, constant.raid ?? 0, next)
                : undefined,
            restore:
              constant.restore !== undefined || constant.abilities?.restore !== undefined
                ? (constant.abilities?.restore ?? 0) +
                  numericValue(state, { source: card }, constant.restore ?? 0, next)
                : undefined,
            triggers: (constant.abilities?.triggers ?? []).map(trigger => ({
              ...trigger,
              id: `constant-${index}-${trigger.id}`,
              effects: [...trigger.effects],
            })),
            exploit: constant.abilities?.exploit,
            firstCombatDamage: constant.abilities?.firstCombatDamage ?? false,
            defenderCombatFirst: constant.abilities?.defenderCombatFirst ?? false,
            surviveZeroHp: constant.abilities?.surviveZeroHp ?? false,
            cannotReady: constant.abilities?.cannotReady ?? false,
            friendlyUnitsEnterReady: constant.abilities?.friendlyUnitsEnterReady ?? false,
            enemyAbilityImmunity: constant.abilities?.enemyAbilityImmunity ?? [],
            losesKeywords: [...(constant.losesKeywords ?? [])],
            power: numericValue(state, { source: card }, constant.power ?? 0, next),
            hp: numericValue(state, { source: card }, constant.hp ?? 0, next),
          };
        },
      );
      if (!value) continue;
      resolved.abilities.keywords = [...(resolved.abilities.keywords ?? []), ...value.keywords];
      if (value.raid !== undefined)
        resolved.abilities.raid = (resolved.abilities.raid ?? 0) + value.raid;
      if (value.exploit !== undefined)
        resolved.abilities.exploit = (resolved.abilities.exploit ?? 0) + value.exploit;
      if (value.restore !== undefined)
        resolved.abilities.restore = (resolved.abilities.restore ?? 0) + value.restore;
      if (value.triggers.length)
        resolved.abilities.triggers = [...(resolved.abilities.triggers ?? []), ...value.triggers];
      resolved.abilities.firstCombatDamage ||= value.firstCombatDamage;
      resolved.abilities.defenderCombatFirst ||= value.defenderCombatFirst;
      resolved.abilities.surviveZeroHp ||= value.surviveZeroHp;
      resolved.abilities.cannotReady ||= value.cannotReady;
      resolved.abilities.friendlyUnitsEnterReady ||= value.friendlyUnitsEnterReady;
      if (value.enemyAbilityImmunity.length)
        resolved.abilities.enemyAbilityImmunity = [
          ...new Set([
            ...(resolved.abilities.enemyAbilityImmunity ?? []),
            ...value.enemyAbilityImmunity,
          ]),
        ];
      resolved.losesKeywords.push(...value.losesKeywords);
      resolved.power += value.power;
      resolved.hp += value.hp;
    }
    origin.resolved = resolved;
  }
  for (const origin of origins) {
    const sharing = originAbilities(state, origin)?.keywordSharing;
    if (origin.suppressed || !sharing || !isUnit(state, card)) continue;
    const observed = evaluate(
      evaluation,
      `keyword-sharing:${card.instanceId}:${card.incarnation}:${origin.id}`,
      next =>
        new Set(
          [...state.ground, ...state.space]
            .map(id => state.cards[id]!)
            .filter(
              other =>
                isUnit(state, other) &&
                other.controller === card.controller &&
                other.instanceId !== card.instanceId,
            )
            .flatMap(other => keywordNames(state, other, next)),
        ),
    );
    if (!observed) continue;
    const resolved = (origin.resolved ??= { abilities: {}, losesKeywords: [], power: 0, hp: 0 });
    resolved.abilities.keywords = [
      ...(resolved.abilities.keywords ?? []),
      ...sharing.keywords.filter(k => observed.has(k)),
    ];
    if (sharing.raid !== undefined && observed.has('Raid'))
      resolved.abilities.raid = (resolved.abilities.raid ?? 0) + sharing.raid;
    if (sharing.restore !== undefined && observed.has('Restore'))
      resolved.abilities.restore = (resolved.abilities.restore ?? 0) + sharing.restore;
  }
  if (isUnit(state, card))
    for (const host of auraHosts(state)) {
      for (const template of baseOrigins(state, host, evaluation)) {
        if (template.suppressed) continue;
        for (const aura of originAbilities(state, template)?.auras ?? []) {
          const id = `aura-${host.instanceId}-${host.incarnation}-${template.id}-${aura.id}`;
          const derived = evaluate(
            evaluation,
            `${id}:${card.instanceId}:${card.incarnation}`,
            next => {
              if (!matchesUnit(state, card, host.controller, aura.filter, { source: host }, next))
                return;
              return {
                abilities: aura.keywordsFromSource ? copiedKeywords(state, host, next) : {},
                power: numericValue(
                  state,
                  { source: host, bindings: { recipient: reference(card) } },
                  aura.power ?? 0,
                  next,
                ),
                hp: numericValue(
                  state,
                  { source: host, bindings: { recipient: reference(card) } },
                  aura.hp ?? 0,
                  next,
                ),
                losesKeywords: [...(aura.losesKeywords ?? [])],
              };
            },
          );
          if (derived)
            origins.push({
              id,
              card: structuredClone(template.card),
              profile: 'aura',
              auraId: aura.id,
              auraProfile: template.profile === 'granted' ? 'granted' : 'printed',
              withoutSupport: false,
              resolved: derived,
            });
        }
      }
    }
  if (attackOverrides(state, card).length)
    for (const origin of origins)
      if (origin.profile !== 'attack-override') origin.suppressed = true;
  const lostKeywords = activeLasting(state, card).flatMap(effect => effect.lostKeywords ?? []);
  if (lostKeywords.length)
    for (const origin of origins)
      origin.lostKeywords = [...new Set([...(origin.lostKeywords ?? []), ...lostKeywords])];
  if (activeLasting(state, card).some(effect => effect.loseKeywords))
    for (const origin of origins) origin.keywordsSuppressed = true;
  if (
    namedAbilityLoss(state, card) ||
    activeLasting(state, card).some(effect => effect.loseAbilities)
  )
    for (const origin of origins) origin.suppressed = true;
  restrictToGrit(state, card, origins);
  return origins;
}
export function abilitiesFrom(state: CatalogContext, origins: readonly AbilityOrigin[]): Abilities {
  const result: Required<Abilities> = {
    lookAtDeckTop: false,
    resourcePaymentTraits: [],
    damageReplacements: [],
    protectSingleFriendlyUpgrade: false,
    protectBaseUpgradeBySelfDefeat: false,
    printedStats: [],
    traitGrants: [],
    friendlyRaidMultiplier: 1,
    keywordSharing: { keywords: [] },
    unitProtection: [],
    cannotReady: false,
    smuggle: [],
    piloting: [],
    bounties: [],
    resourceSmuggle: [],
    friendlyRescueReady: false,
    friendlyUnitsEnterReady: false,
    surviveZeroHp: false,
    protectFromAttackUnlessSentinel: [],
    baseDamageLimit: Number.MAX_SAFE_INTEGER,
    providesAspects: false,
    firstCombatDamage: false,
    defenderCombatFirst: false,
    enemyAbilityImmunity: [],
    cannotChangeController: false,
    preventSelfByTraitSacrifice: false,
    preventFriendlyByShield: false,
    unpreventableDamageTraits: [],
    creditPayment: false,
    blankEnemyCredits: false,
    blankFriendlyAdvantages: false,
    searchMultiplier: 1,
    defeatToUnit: false,
    defeatToUpgrade: false,
    halveResourcePayments: false,
    doubleTokensBySelfDefeat: false,
    cannotAttack: false,
    attackBothArenas: false,
    cannotAttackBases: false,
    ambushCanAttackBases: false,
    preventBaseHealing: false,
    cannotAttackUndamaged: false,
    keywords: [],
    actions: [],
    triggers: [],
    raid: 0,
    restore: 0,
    exploit: 0,
    constant: [],
    auras: [],
    playReductions: [],
    ignoreAspectPenalties: [],
    extraPilotSlots: 0,
    extraRegroups: 0,
    indirectBonus: 0,
    assignsOpponentIndirect: false,
    assignsOwnIndirect: false,
    regroupReadyPower: 0,
    powerModifier: 0,
    hpModifier: 0,
  };
  const losses = new Set<string>();
  for (const origin of origins) {
    if (origin.suppressed) {
      // A recipient losing abilities still receives external numeric modifiers.
      if (origin.profile === 'aura' && origin.resolved) {
        result.powerModifier += origin.resolved.power;
        result.hpModifier += origin.resolved.hp;
        for (const keyword of origin.resolved.losesKeywords) losses.add(keyword);
      }
      continue;
    }
    const abilities = originAbilities(state, origin);
    if (!abilities) throw new Error('Missing granted ability profile');
    result.keywords = [
      ...new Set([
        ...result.keywords,
        ...(origin.keywordsSuppressed ? [] : (abilities.keywords ?? [])).filter(
          keyword =>
            (!origin.withoutSupport || keyword !== 'Support') &&
            !origin.lostKeywords?.includes(keyword),
        ),
      ]),
    ];
    const identify = (id: string) => (origin.id === 'self' ? id : `${origin.id}-${id}`);
    if (!origin.keywordsSuppressed && !origin.lostKeywords?.includes('Bounty'))
      result.bounties = [
        ...result.bounties,
        ...[...(abilities.bounties ?? []), ...(origin.resolved?.abilities.bounties ?? [])].map(
          b => ({ ...b, id: identify(b.id) }),
        ),
      ];
    if (!origin.keywordsSuppressed && !origin.lostKeywords?.includes('Smuggle'))
      result.smuggle = [
        ...result.smuggle,
        ...[...(abilities.smuggle ?? []), ...(origin.resolved?.abilities.smuggle ?? [])].map(
          cost => ({ ...cost, id: identify(cost.id) }),
        ),
      ];
    if (!origin.keywordsSuppressed && !origin.lostKeywords?.includes('Piloting'))
      result.piloting = [
        ...result.piloting,
        ...[...(abilities.piloting ?? []), ...(origin.resolved?.abilities.piloting ?? [])].map(
          cost => ({ ...cost, id: identify(cost.id) }),
        ),
      ];
    if (!origin.keywordsSuppressed && !origin.lostKeywords?.includes('Exploit'))
      result.exploit += (abilities.exploit ?? 0) + (origin.resolved?.abilities.exploit ?? 0);
    result.printedStats = [...result.printedStats, ...(abilities.printedStats ?? [])];
    result.traitGrants = [...result.traitGrants, ...(abilities.traitGrants ?? [])];
    result.friendlyRaidMultiplier *= abilities.friendlyRaidMultiplier ?? 1;
    result.unitProtection = [...result.unitProtection, ...(abilities.unitProtection ?? [])];
    result.cannotReady ||= abilities.cannotReady ?? false;
    result.lookAtDeckTop ||= abilities.lookAtDeckTop ?? false;
    result.resourcePaymentTraits = [
      ...result.resourcePaymentTraits,
      ...(abilities.resourcePaymentTraits ?? []),
    ];
    result.damageReplacements = [
      ...result.damageReplacements,
      ...(abilities.damageReplacements ?? []).map(r => ({ ...r, id: identify(r.id) })),
    ];
    result.protectSingleFriendlyUpgrade ||= abilities.protectSingleFriendlyUpgrade ?? false;
    result.protectBaseUpgradeBySelfDefeat ||= abilities.protectBaseUpgradeBySelfDefeat ?? false;
    result.resourceSmuggle = [...result.resourceSmuggle, ...(abilities.resourceSmuggle ?? [])];
    result.actions = [
      ...result.actions,
      ...(abilities.actions ?? []).map(ability => ({ ...ability, id: identify(ability.id) })),
    ];
    result.triggers = [
      ...result.triggers,
      ...(abilities.triggers ?? []).map(ability => ({ ...ability, id: identify(ability.id) })),
    ];
    if (origin.resolved) {
      result.triggers = [
        ...result.triggers,
        ...(origin.resolved.abilities.triggers ?? []).map(trigger => ({
          ...trigger,
          id: identify(trigger.id),
        })),
      ];
      result.keywords = [
        ...new Set([
          ...result.keywords,
          ...(origin.keywordsSuppressed ? [] : (origin.resolved.abilities.keywords ?? [])).filter(
            k => (!origin.withoutSupport || k !== 'Support') && !origin.lostKeywords?.includes(k),
          ),
        ]),
      ];
      result.raid += origin.keywordsSuppressed ? 0 : (origin.resolved.abilities.raid ?? 0);
      result.restore += origin.keywordsSuppressed ? 0 : (origin.resolved.abilities.restore ?? 0);
      result.firstCombatDamage ||= origin.resolved.abilities.firstCombatDamage ?? false;
      result.defenderCombatFirst ||= origin.resolved.abilities.defenderCombatFirst ?? false;
      result.surviveZeroHp ||= origin.resolved.abilities.surviveZeroHp ?? false;
      result.friendlyUnitsEnterReady ||= origin.resolved.abilities.friendlyUnitsEnterReady ?? false;
      result.cannotReady ||= origin.resolved.abilities.cannotReady ?? false;
      if (origin.resolved.abilities.enemyAbilityImmunity?.length)
        result.enemyAbilityImmunity = [
          ...new Set([
            ...result.enemyAbilityImmunity,
            ...origin.resolved.abilities.enemyAbilityImmunity,
          ]),
        ];
      result.powerModifier += origin.resolved.power;
      result.hpModifier += origin.resolved.hp;
      for (const keyword of origin.resolved.losesKeywords) losses.add(keyword);
    }
    result.auras = [...result.auras, ...(abilities.auras ?? [])];
    result.friendlyRescueReady ||= abilities.friendlyRescueReady ?? false;
    result.surviveZeroHp ||= abilities.surviveZeroHp ?? false;
    if (abilities.protectFromAttackUnlessSentinel?.length)
      result.protectFromAttackUnlessSentinel = [
        ...result.protectFromAttackUnlessSentinel,
        ...abilities.protectFromAttackUnlessSentinel,
      ];
    result.ignoreAspectPenalties = [
      ...result.ignoreAspectPenalties,
      ...(abilities.ignoreAspectPenalties ?? []),
    ];
    result.playReductions = [
      ...result.playReductions,
      ...(abilities.playReductions ?? []).map(r => ({ ...r, id: identify(r.id) })),
    ];
    result.enemyAbilityImmunity = [
      ...new Set([...result.enemyAbilityImmunity, ...(abilities.enemyAbilityImmunity ?? [])]),
    ];
    result.baseDamageLimit = Math.min(
      result.baseDamageLimit,
      abilities.baseDamageLimit ?? Number.MAX_SAFE_INTEGER,
    );
    result.providesAspects ||= abilities.providesAspects ?? false;
    result.firstCombatDamage ||= abilities.firstCombatDamage ?? false;
    result.defenderCombatFirst ||= abilities.defenderCombatFirst ?? false;
    result.defeatToUnit ||= abilities.defeatToUnit ?? false;
    result.defeatToUpgrade ||= abilities.defeatToUpgrade ?? false;
    result.halveResourcePayments ||= abilities.halveResourcePayments ?? false;
    result.doubleTokensBySelfDefeat ||= abilities.doubleTokensBySelfDefeat ?? false;
    result.cannotChangeController ||= abilities.cannotChangeController ?? false;
    result.preventSelfByTraitSacrifice ||= abilities.preventSelfByTraitSacrifice ?? false;
    result.preventFriendlyByShield ||= abilities.preventFriendlyByShield ?? false;
    result.unpreventableDamageTraits = [
      ...new Set([
        ...result.unpreventableDamageTraits,
        ...(abilities.unpreventableDamageTraits ?? []),
      ]),
    ];
    result.creditPayment ||= abilities.creditPayment ?? false;
    result.blankEnemyCredits ||= abilities.blankEnemyCredits ?? false;
    result.blankFriendlyAdvantages ||= abilities.blankFriendlyAdvantages ?? false;
    result.searchMultiplier *= abilities.searchMultiplier ?? 1;
    result.cannotAttack ||= abilities.cannotAttack ?? false;
    result.attackBothArenas ||= abilities.attackBothArenas ?? false;
    result.cannotAttackBases ||= abilities.cannotAttackBases ?? false;
    result.ambushCanAttackBases ||= abilities.ambushCanAttackBases ?? false;
    result.preventBaseHealing ||= abilities.preventBaseHealing ?? false;
    result.friendlyUnitsEnterReady ||= abilities.friendlyUnitsEnterReady ?? false;
    result.cannotAttackUndamaged ||= abilities.cannotAttackUndamaged ?? false;
    result.extraPilotSlots += abilities.extraPilotSlots ?? 0;
    result.extraRegroups += abilities.extraRegroups ?? 0;
    result.indirectBonus += abilities.indirectBonus ?? 0;
    result.assignsOpponentIndirect ||= abilities.assignsOpponentIndirect ?? false;
    result.assignsOwnIndirect ||= abilities.assignsOwnIndirect ?? false;
    result.regroupReadyPower = Math.max(result.regroupReadyPower, abilities.regroupReadyPower ?? 0);
    result.raid += origin.keywordsSuppressed ? 0 : (abilities.raid ?? 0);
    result.restore += origin.keywordsSuppressed ? 0 : (abilities.restore ?? 0);
  }
  if (losses.has('Exploit')) result.exploit = 0;
  result.keywords = result.keywords.filter(keyword => !losses.has(keyword));
  return result;
}
// Conservative capability checks do not evaluate conditions or suppression;
// effectiveAbilities remains the authority. These fields cannot come from auras.
type RareAbility =
  | 'halveResourcePayments'
  | 'regroupReadyPower'
  | 'lookAtDeckTop'
  | 'printedStats'
  | 'traitGrants'
  | 'friendlyRaidMultiplier'
  | 'unitProtection'
  | 'cannotReady'
  | 'surviveZeroHp'
  | 'protectFromAttackUnlessSentinel'
  | 'exploit'
  | 'smuggle'
  | 'resourcePaymentTraits'
  | 'resourceSmuggle';
function containsAbility(abilities: Abilities | undefined, key: RareAbility): boolean {
  const value = abilities?.[key];
  return (
    !!(Array.isArray(value) ? value.length : value) ||
    ((key === 'surviveZeroHp' || key === 'exploit' || key === 'cannotReady') &&
      !!abilities?.constant?.some(c => c.abilities?.[key]))
  );
}
export function potentialAbilitySources(state: GameState, key: RareAbility): CardInstance[] {
  const ids = new Set<string>();
  for (const card of Object.values(state.cards)) {
    if (!['base', 'ground', 'space'].includes(card.zone)) continue;
    if (containsAbility(activeAbilities(state, card), key)) ids.add(card.instanceId);
    if (
      card.attachedTo &&
      containsAbility(upgradeProfile(cardDefinition(state, card.cardId))?.grants, key)
    )
      ids.add(card.attachedTo.instanceId);
  }
  for (const attack of state.attacks)
    if (
      attack.grantedAbilities.some(origin => containsAbility(originAbilities(state, origin), key))
    )
      ids.add(attack.attacker.instanceId);
  for (const effect of state.lastingEffects)
    if (containsAbility(effect.abilities, key)) ids.add(effect.target.instanceId);
  return [...ids]
    .map(id => state.cards[id]!)
    .filter(card => ['base', 'ground', 'space'].includes(card.zone));
}
export function mayHaveAbility(state: GameState, card: CardInstance, key: RareAbility): boolean {
  if (
    isUnit(state, card) &&
    (key === 'exploit' || key === 'smuggle') &&
    auraHosts(state).some(host =>
      baseOrigins(state, host).some(o =>
        originAbilities(state, o)?.auras?.some(a => a.keywordsFromSource),
      ),
    )
  )
    return true;
  if (containsAbility(activeAbilities(state, card), key)) return true;
  if (isUnit(state, card)) {
    if (
      attachedUpgrades(state, card).some(upgrade =>
        containsAbility(upgradeProfile(cardDefinition(state, upgrade.cardId))?.grants, key),
      )
    )
      return true;
    if (
      state.attacks.some(
        attack =>
          attack.attacker.instanceId === card.instanceId &&
          attack.attacker.incarnation === card.incarnation &&
          attack.grantedAbilities.some(origin =>
            containsAbility(originAbilities(state, origin), key),
          ),
      )
    )
      return true;
  }
  return activeLasting(state, card).some(effect => containsAbility(effect.abilities, key));
}

export function effectiveAbilities(
  state: GameState,
  card: CardInstance,
  evaluation?: Evaluation,
): Abilities {
  const abilities = abilitiesFrom(state, abilityOrigins(state, card, evaluation));
  if (isUnit(state, card) && abilities.raid)
    for (const source of potentialAbilitySources(state, 'friendlyRaidMultiplier')) {
      if (source.controller !== card.controller) continue;
      const multiplier =
        evaluate(
          evaluation,
          `raid-multiplier:${source.instanceId}:${source.incarnation}`,
          next =>
            abilitiesFrom(state, abilityOrigins(state, source, next)).friendlyRaidMultiplier ?? 1,
        ) ?? 1;
      abilities.raid *= multiplier;
    }
  if (losesAttackingOverwhelm(state, card))
    abilities.keywords = abilities.keywords?.filter(k => k !== 'Overwhelm');
  const attack = state.attacks.at(-1);
  if (
    attack?.swapRaidRestore &&
    attack.attacker.instanceId === card.instanceId &&
    attack.attacker.incarnation === card.incarnation
  ) {
    const raid = abilities.raid;
    abilities.raid = abilities.restore;
    abilities.restore = raid;
  }
  return abilities;
}
export function supportSourceOrigins(state: GameState, source: CardInstance): AbilityOrigin[] {
  const current = state.cards[source.instanceId];
  const origins =
    current &&
    current.incarnation === source.incarnation &&
    (isUnit(state, current) || isUpgrade(state, current))
      ? abilityOrigins(state, current)
      : [...state.departedUnits, ...state.departedUpgrades].find(
          entry =>
            entry.reference.instanceId === source.instanceId &&
            entry.reference.incarnation === source.incarnation,
        )?.abilities;
  if (!origins) throw new Error('Missing Support source history');
  return origins;
}
export function supportOrigins(
  state: GameState,
  source: CardInstance,
  preview = false,
): AbilityOrigin[] {
  const sourceOrigins = supportSourceOrigins(state, source);
  const lost = [...new Set(sourceOrigins.flatMap(origin => origin.resolved?.losesKeywords ?? []))];
  return sourceOrigins.map((origin, index) => {
    const copied = structuredClone(origin);
    if (copied.resolved) {
      copied.resolved.losesKeywords = [];
      if (copied.profile === 'aura') {
        copied.resolved.power = 0;
        copied.resolved.hp = 0;
      }
    }
    return {
      ...copied,
      id: preview ? `support-preview-${index}` : allocateId(state, 'g'),
      withoutSupport: true,
      ...(lost.length
        ? { lostKeywords: [...new Set([...(copied.lostKeywords ?? []), ...lost])] }
        : {}),
    };
  });
}
export function assertAbilityOrigins(state: GameState, origins: readonly AbilityOrigin[]) {
  const ids = new Set<string>();
  for (const origin of origins) {
    const current = state.cards[origin.card.instanceId];
    if (
      !current ||
      current.cardId !== origin.card.cardId ||
      current.incarnation < origin.card.incarnation ||
      !historicalOwnerMatches(state, current, origin.card) ||
      !state.seats.includes(origin.card.controller) ||
      ids.has(origin.id)
    )
      throw new Error('Invalid ability origin');
    ids.add(origin.id);
    if (
      (origin.profile === 'aura') !== (origin.auraId !== undefined) ||
      (origin.profile === 'aura') !== (origin.auraProfile !== undefined) ||
      (origin.profile === 'aura' &&
        !auraDefinitions(state, origin).some(a => a.id === origin.auraId))
    )
      throw new Error('Invalid aura origin');
    if (
      origin.profile === 'discarded-unit' &&
      (cardDefinition(state, origin.card.cardId).kind !== 'unit' ||
        origin.card.zone !== 'discard' ||
        origin.card.attachedTo)
    )
      throw new Error('Invalid discarded ability origin');
    if (origin.profile === 'scheduled') scheduledDefinition(state, origin.card, origin.scheduledId);
    else if (origin.scheduledId !== undefined)
      throw new Error('Unexpected scheduled ability identity');
    if (origin.profile === 'attack-grant') {
      const definition = cardDefinition(state, origin.card.cardId);
      if (
        definition.kind !== 'event' ||
        !definition.attackGrants?.length ||
        origin.card.zone !== 'discard'
      )
        throw new Error('Invalid attack grant origin');
    }
    if ((origin.profile === 'lasting') !== (origin.abilities !== undefined))
      throw new Error('Invalid lasting ability origin');
    if (
      origin.profile === 'attack-override' &&
      (!origin.card.attachedTo ||
        !upgradeProfile(cardDefinition(state, current.cardId))?.attackOverride)
    )
      throw new Error('Invalid attack override');
    if (
      origin.profile === 'granted' &&
      (!origin.card.attachedTo || !upgradeProfile(cardDefinition(state, current.cardId))?.grants)
    )
      throw new Error('Invalid granted ability origin');
  }
}

// Runtime prefixes disambiguate copies inside the authority. Public labels use
// printed IDs, with a separate source reference for an ability that was granted.
export function abilityIdentity(origins: readonly AbilityOrigin[], id: string) {
  const origin = origins.find(origin => origin.id !== 'self' && id.startsWith(`${origin.id}-`));
  return { id: origin ? id.slice(origin.id.length + 1) : id, origin: origin?.card ?? null };
}

// Keywords with numbers count by name, and a numeric value of zero still
// represents that keyword. Printed Piloting belongs only to its active face.
export function keywordNames(
  state: GameState,
  card: CardInstance,
  evaluation?: Evaluation,
): string[] {
  const origins = abilityOrigins(state, card, evaluation);
  const abilities = abilitiesFrom(state, origins);
  const names = new Set<string>(abilities.keywords ?? []);
  if (abilities.bounties?.length) names.add('Bounty');
  if (abilities.piloting?.length) names.add('Piloting');
  if (abilities.smuggle?.length) names.add('Smuggle');
  const lost = new Set(
    origins.flatMap(o => (o.suppressed ? [] : (o.resolved?.losesKeywords ?? []))),
  );
  for (const origin of origins) {
    if (origin.suppressed || origin.keywordsSuppressed) continue;
    const abilities = originAbilities(state, origin);
    if (!abilities) continue;
    for (const [key, name] of [
      ['raid', 'Raid'],
      ['restore', 'Restore'],
      ['exploit', 'Exploit'],
    ] as const)
      if (
        !origin.lostKeywords?.includes(name) &&
        (abilities[key] !== undefined || origin.resolved?.abilities[key] !== undefined)
      )
        names.add(name);
    if (
      ['printed', 'discarded-unit'].includes(origin.profile) &&
      'piloting' in abilities &&
      Array.isArray(abilities.piloting) &&
      abilities.piloting.length &&
      !origin.lostKeywords?.includes('Piloting')
    )
      names.add('Piloting');
  }
  if (card.zone === 'resources' && smuggleOptions(state, card, evaluation).length)
    names.add('Smuggle');
  for (const name of lost) names.delete(name);
  if (losesAttackingOverwhelm(state, card)) names.delete('Overwhelm');
  return [...names];
}

// Only keyword abilities cross this aura. Keep numeric instances and cost/reward
// definitions, but never copy the sharing aura itself or ordinary abilities.
function copiedKeywords(state: GameState, source: CardInstance, evaluation: Evaluation) {
  const abilities = effectiveAbilities(state, source, evaluation);
  const names = new Set(keywordNames(state, source, evaluation));
  return {
    keywords: [...(abilities.keywords ?? [])],
    ...(names.has('Raid') ? { raid: abilities.raid ?? 0 } : {}),
    ...(names.has('Restore') ? { restore: abilities.restore ?? 0 } : {}),
    ...(names.has('Exploit') ? { exploit: abilities.exploit ?? 0 } : {}),
    ...(names.has('Bounty') ? { bounties: [...(abilities.bounties ?? [])] } : {}),
    ...(names.has('Smuggle') ? { smuggle: [...(abilities.smuggle ?? [])] } : {}),
    ...(names.has('Piloting') ? { piloting: [...(abilities.piloting ?? [])] } : {}),
  };
}

// Attributes and numeric bonuses imposed by other cards are not abilities of
// their recipient (v8 §§7.3, 8.14). An inactive conditional ability still is.
const nonAbilityFields = new Set([
  'cardId',
  'name',
  'aspects',
  'traits',
  'unique',
  'kind',
  'cost',
  'power',
  'hp',
  'arena',
  'token',
  'upgrade',
  'printedCost',
]);
const keywordFields = new Set([
  'keywords',
  'raid',
  'restore',
  'exploit',
  'bounties',
  'smuggle',
  'piloting',
]);
export function hasUnitAbilities(
  state: GameState,
  card: CardInstance,
  evaluation?: Evaluation,
): boolean {
  if (keywordNames(state, card, evaluation).length) return true;
  return abilityOrigins(state, card, evaluation).some(origin => {
    if (origin.suppressed) return false;
    const abilities = originAbilities(state, origin);
    return (
      !!abilities &&
      Object.entries(abilities).some(
        ([key, value]) =>
          !nonAbilityFields.has(key) &&
          !keywordFields.has(key) &&
          (Array.isArray(value) ? value.length > 0 : value !== undefined && value !== false),
      )
    );
  });
}
