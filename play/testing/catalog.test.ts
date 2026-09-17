import ibh from './fixtures/ibh.json';
import jtlPayments from './fixtures/jtl-payments.json';
import jtlDefeats from './fixtures/jtl-defeats.json';
import jtlKeywords from './fixtures/jtl-keywords.json';
import jtlConversions from './fixtures/jtl-conversions.json';
import jtlInteractions from './fixtures/jtl-interactions.json';
import jtlEffects from './fixtures/jtl-effects.json';
import jtlFoundations from './fixtures/jtl-foundations.json';
import lofFinale from './fixtures/lof-finale.json';
import lofAttributes from './fixtures/lof-attributes.json';
import lofEffects from './fixtures/lof-effects.json';
import lofFoundations from './fixtures/lof-foundations.json';
import secPayments from './fixtures/sec-payments.json';
import secPassives from './fixtures/sec-passives.json';
import secSequences from './fixtures/sec-sequences.json';
import secChoices from './fixtures/sec-choices.json';
import secHistory from './fixtures/sec-history.json';
import secEffects from './fixtures/sec-effects.json';
import secFoundations from './fixtures/sec-foundations.json';
import lawFinal from './fixtures/law-final.json';
import lawAttributes from './fixtures/law-attributes.json';
import lawInteractions from './fixtures/law-interactions.json';
import lawHistory from './fixtures/law-history.json';
import lawEffects from './fixtures/law-effects.json';
import lawFoundations from './fixtures/law-foundations.json';
import ashFinal from './fixtures/ash-final.json';
import ashPhase from './fixtures/ash-phase.json';
import ashAdvanced from './fixtures/ash-advanced.json';
import ashEffects from './fixtures/ash-effects.json';
import ashFoundations from './fixtures/ash-foundations.json';
import leaderExploit from './fixtures/leader-exploit.json';
import leaderBounties from './fixtures/leader-bounties.json';
import leaderSharedKeywords from './fixtures/leader-shared-keywords.json';
import leaderSmuggle from './fixtures/leader-smuggle.json';
import leaderPlotDiscount from './fixtures/leader-plot-discount.json';
import leaderCollectiveAmbition from './fixtures/leader-collective-ambition.json';
import leaderRepeatedAbilities from './fixtures/leader-repeated-abilities.json';
import leaderRecovery from './fixtures/leader-recovery.json';
import leaderPrivateChoices from './fixtures/leader-private-choices.json';
import leaderPhaseEvents from './fixtures/leader-phase-events.json';
import leaderCostsDamage from './fixtures/leader-costs-damage.json';
import leaderReactions from './fixtures/leader-reactions.json';
import leaderFaces from './fixtures/leader-faces.json';
import leaderDeployment from './fixtures/leader-deployment.json';
import leaderCombat from './fixtures/leader-combat.json';
import leaderPlays from './fixtures/leader-plays.json';
import leaderHistory from './fixtures/leader-history.json';
import leaderResourceRepayment from './fixtures/leader-resource-repayment.json';
import leaderBaseAllocations from './fixtures/leader-base-allocations.json';
import leaderBaseChoices from './fixtures/leader-base-choices.json';
import leaderFoundations from './fixtures/leader-foundations.json';
import leaderBaseFoundations from './fixtures/leader-base-foundations.json';
import top8Luke from './fixtures/top8-luke.json';
import top8Conversion from './fixtures/top8-conversion.json';
import top8Moff from './fixtures/top8-moff.json';
import top8Identity from './fixtures/top8-identity.json';
import top8Thrawn from './fixtures/top8-thrawn.json';
import top8Invoke from './fixtures/top8-invoke.json';
import top8Victory from './fixtures/top8-victory.json';
import top8Turns from './fixtures/top8-turns.json';
import top8Nabat from './fixtures/top8-nabat.json';
import top8LeaderChoices from './fixtures/top8-leader-choices.json';
import top8PilotFoundations from './fixtures/top8-pilot-foundations.json';
import top8Restrictions from './fixtures/top8-restrictions.json';
import top8Prevention from './fixtures/top8-prevention.json';
import top8Attacks from './fixtures/top8-attacks.json';
import top8Control from './fixtures/top8-control.json';
import top8Hidden from './fixtures/top8-hidden.json';
import top8Optional from './fixtures/top8-optional.json';
import top8Costs from './fixtures/top8-costs.json';
import top8History from './fixtures/top8-history.json';
import top8Traits from './fixtures/top8-traits.json';
import top8SearchCombat from './fixtures/top8-search-combat.json';
import top8Observers from './fixtures/top8-observers.json';
import top8Conditions from './fixtures/top8-conditions.json';
import top8Tokens from './fixtures/top8-tokens.json';
import top8Attachments from './fixtures/top8-attachments.json';
import top8Effects from './fixtures/top8-effects.json';
import top8Foundations from './fixtures/top8-foundations.json';
import metaResourcePlay from './fixtures/meta-resource-play.json';
import metaActionDelays from './fixtures/meta-action-delays.json';
import metaAttackGrants from './fixtures/meta-attack-grants.json';
import metaDeckOrder from './fixtures/meta-deck-order.json';
import metaObservers from './fixtures/meta-observers.json';
import metaCapture from './fixtures/meta-capture.json';
import metaConstrainedSearch from './fixtures/meta-constrained-search.json';
import metaBenefits from './fixtures/meta-benefits.json';
import metaWagers from './fixtures/meta-wagers.json';
import metaSacrificeCosts from './fixtures/meta-sacrifice-costs.json';
import metaRegroup from './fixtures/meta-regroup.json';
import metaDiscardPlay from './fixtures/meta-discard-play.json';
import metaZoneSearch from './fixtures/meta-zone-search.json';
import metaPlayerChoices from './fixtures/meta-player-choices.json';
import metaCombatOrder from './fixtures/meta-combat-order.json';
import metaNaming from './fixtures/meta-naming.json';
import metaPilotLeaders from './fixtures/meta-pilot-leaders.json';
import metaAttachments from './fixtures/meta-attachments.json';
import metaAspectAbilities from './fixtures/meta-aspect-abilities.json';
import metaPrevention from './fixtures/meta-prevention.json';
import { expect, test } from 'bun:test';
import { effectSchema } from '../engine/model.ts';
import metaFoundations from './fixtures/meta-foundations.json';
import metaCombat from './fixtures/meta-combat.json';
import metaEffects from './fixtures/meta-effects.json';
import metaTokens from './fixtures/meta-tokens.json';
import metaBoard from './fixtures/meta-board.json';
import metaPostSearch from './fixtures/meta-post-search.json';
import metaAttackOutcomes from './fixtures/meta-attack-outcomes.json';
import metaCredits from './fixtures/meta-credits.json';
import metaDisclose from './fixtures/meta-disclose.json';
import metaPlot from './fixtures/meta-plot.json';
import metaPlayCosts from './fixtures/meta-play-costs.json';
import metaContinuous from './fixtures/meta-continuous.json';
import metaHiddenZones from './fixtures/meta-hidden-zones.json';
import metaMovement from './fixtures/meta-movement.json';
import metaForceIndirect from './fixtures/meta-force-indirect.json';
const metaPins: Record<
  string,
  {
    text: string | null;
    unique?: boolean;
    keywords: string[];
    epicAction?: string | null;
    deployBox?: string | null;
    rules?: string | null;
  }
> = {
  ...ibh,
  ...secFoundations,
  ...secEffects,
  ...secHistory,
  ...secChoices,
  ...secSequences,
  ...secPassives,
  ...secPayments,
  ...lofFoundations,
  ...lofEffects,
  ...lofAttributes,
  ...lofFinale,
  ...jtlFoundations,
  ...jtlEffects,
  ...jtlInteractions,
  ...jtlConversions,
  ...jtlKeywords,
  ...jtlDefeats,
  ...jtlPayments,
  ...lawFoundations,
  ...lawEffects,
  ...lawHistory,
  ...lawInteractions,
  ...lawAttributes,
  ...lawFinal,
  ...ashFinal,
  ...ashPhase,
  ...ashAdvanced,
  ...ashEffects,
  ...ashFoundations,
  ...leaderSmuggle,
  ...leaderSharedKeywords,
  ...leaderBounties,
  ...leaderExploit,
  ...leaderPlotDiscount,
  ...leaderCollectiveAmbition,
  ...leaderRepeatedAbilities,
  ...leaderRecovery,
  ...leaderPrivateChoices,
  ...leaderPhaseEvents,
  ...leaderCostsDamage,
  ...leaderReactions,
  ...leaderFaces,
  ...leaderDeployment,
  ...leaderCombat,
  ...leaderPlays,
  ...leaderHistory,
  ...leaderResourceRepayment,
  ...leaderBaseAllocations,
  ...leaderBaseChoices,
  ...leaderFoundations,
  ...leaderBaseFoundations,
  ...top8Luke,
  ...top8Conversion,
  ...top8Moff,
  ...top8Identity,
  ...top8Thrawn,
  ...top8Invoke,
  ...top8Victory,
  ...top8Turns,
  ...top8Nabat,
  ...top8LeaderChoices,
  ...top8PilotFoundations,
  ...top8Restrictions,
  ...top8Prevention,
  ...top8Attacks,
  ...top8Control,
  ...top8Hidden,
  ...top8Optional,
  ...top8Costs,
  ...top8History,
  ...top8Traits,
  ...top8SearchCombat,
  ...top8Observers,
  ...top8Conditions,
  ...top8Tokens,
  ...top8Attachments,
  ...top8Effects,
  ...top8Foundations,
  ...metaFoundations,
  ...metaCombat,
  ...metaEffects,
  ...metaTokens,
  ...metaBoard,
  ...metaForceIndirect,
  ...metaMovement,
  ...metaHiddenZones,
  ...metaContinuous,
  ...metaPlayCosts,
  ...metaPlot,
  ...metaDisclose,
  ...metaCredits,
  ...metaAttackOutcomes,
  ...metaPostSearch,
  ...metaPrevention,
  ...metaAspectAbilities,
  ...metaAttachments,
  ...metaPilotLeaders,
  ...metaNaming,
  ...metaCombatOrder,
  ...metaPlayerChoices,
  ...metaZoneSearch,
  ...metaDiscardPlay,
  ...metaRegroup,
  ...metaSacrificeCosts,
  ...metaWagers,
  ...metaBenefits,
  ...metaConstrainedSearch,
  ...metaCapture,
  ...metaObservers,
  ...metaDeckOrder,
  ...metaResourcePlay,
  ...metaActionDelays,
  ...metaAttackGrants,
};
import { supportedCards, coverage, cardDefinition } from '../cards/registry.ts';

test('every registered continuation conforms to the checkpoint contract', () => {
  function visit(value: unknown) {
    if (!value || typeof value !== 'object') return;
    if ('effects' in value && Array.isArray(value.effects))
      for (const effect of value.effects) expect(effectSchema.parse(effect)).toEqual(effect);
    for (const nested of Object.values(value)) visit(nested);
  }
  for (const card of supportedCards) visit(card);
});

test('each supported card has a dedicated file and agrees with its pinned catalog', async () => {
  const official = await Bun.file(
    new URL('../../server/db/json/card-list.json', import.meta.url),
  ).json();
  const hmw = (await Bun.file(new URL('../cards/hmw/catalog.json', import.meta.url)).json()) as {
    cardId: string;
    name: string;
    type: string;
    cost: number | null;
    power: number | null;
    hp: number | null;
    upgradePower: number | null;
    upgradeHp: number | null;
    aspects: string[];
    traits: string[];
    arenas: string[];
  }[];
  const hmwById = Object.fromEntries(hmw.map(card => [card.cardId, card]));
  const catalog = { ...official, ...hmwById };
  expect(hmw).toHaveLength(268);
  expect(supportedCards).toHaveLength(1768);
  expect(coverage.map(row => row.cardId)).toEqual(supportedCards.map(card => card.cardId));
  for (const definition of supportedCards) {
    if (definition.cardId === 'beast' || definition.cardId === 'weakness') {
      expect(
        await Bun.file(new URL(`../cards/hmw/${definition.cardId}.ts`, import.meta.url)).exists(),
      ).toBe(true);
      continue;
    }
    const card = catalog[definition.cardId];
    const hmwCard = definition.cardId in hmwById;
    expect(card.cardId).toBe(definition.cardId);
    expect(card.name).toBe(definition.name);
    expect(card.type.toLowerCase()).toBe(
      definition.kind === 'player-token'
        ? `${definition.tokenType} token`
        : (definition.kind === 'upgrade' || definition.kind === 'unit') && definition.token
          ? `token ${definition.kind}`
          : definition.kind,
    );
    if (definition.kind === 'upgrade') {
      expect(definition.modifiers).toEqual({
        power: definition.token
          ? (card.power ?? card.upgradePower ?? 0)
          : hmwCard
            ? (card.upgradePower ?? 0)
            : card.upgradePower,
        hp: definition.token
          ? (card.hp ?? card.upgradeHp ?? 0)
          : hmwCard
            ? (card.upgradeHp ?? 0)
            : card.upgradeHp,
      });
      expect(definition.cost).toBe(card.cost);
    } else if (definition.kind !== 'event' && definition.kind !== 'player-token')
      expect(card.hp).toBe(
        definition.kind === 'leader' ? (definition.faces.unit?.hp ?? null) : definition.hp,
      );
    expect([...card.aspects].sort()).toEqual([...definition.aspects].sort());
    expect([...card.traits].sort()).toEqual([...definition.traits].sort());
    const printings = hmwCard
      ? [{ set: 'hmw' }]
      : (Object.values(card.variants) as { baseSet: boolean; set: string }[]).filter(
          variant => variant.baseSet,
        );
    expect(
      (
        await Promise.all(
          printings.map(printing =>
            Bun.file(
              new URL(`../cards/${printing.set}/${definition.cardId}.ts`, import.meta.url),
            ).exists(),
          ),
        )
      ).some(Boolean),
    ).toBe(true);
    if (hmwCard) {
      if (definition.kind === 'event') expect(card.cost).toBe(definition.cost);
      if (definition.kind === 'unit') {
        expect(card.cost).toBe(definition.cost);
        expect(card.power).toBe(definition.power);
        expect(card.arenas.map((s: string) => s.toLowerCase())).toEqual([definition.arena]);
      }
      if (definition.kind === 'leader') {
        expect(card.cost).toBe(definition.printedCost);
        expect(card.power).toBe(definition.faces.unit?.power ?? null);
        expect(card.arenas.map((s: string) => s.toLowerCase())).toEqual([
          definition.faces.unit?.arena,
        ]);
      }
      continue;
    }
    if (
      (definition.kind === 'base' &&
        !definition.auras &&
        !definition.actions &&
        !definition.damageReplacements?.length &&
        !definition.resourcePaymentTraits?.length &&
        !definition.protectSingleFriendlyUpgrade &&
        !definition.protectFromAttackUnlessSentinel &&
        !definition.printedStats &&
        !definition.traitGrants &&
        !definition.lookAtDeckTop &&
        !definition.triggers &&
        !definition.minimumDeckIncrease &&
        !definition.startingHandReduction) ||
      (definition.kind === 'unit' &&
        !definition.damageReplacements?.length &&
        !definition.resourcePaymentTraits?.length &&
        !definition.protectSingleFriendlyUpgrade &&
        !definition.protectFromAttackUnlessSentinel &&
        !definition.printedStats &&
        !definition.traitGrants &&
        !definition.lookAtDeckTop &&
        !definition.triggers &&
        !definition.keywords &&
        !definition.piloting &&
        !definition.raid &&
        !definition.restore &&
        !definition.entersReady &&
        !definition.actions &&
        !definition.constant &&
        !definition.auras &&
        !definition.extraPilotSlots &&
        !definition.extraRegroups &&
        !definition.playReductions &&
        !definition.indirectBonus &&
        !definition.assignsOpponentIndirect &&
        !definition.enemyAbilityImmunity &&
        !definition.cannotChangeController &&
        !definition.preventSelfByTraitSacrifice &&
        !definition.preventFriendlyByShield &&
        !definition.unpreventableDamageTraits &&
        !definition.blankEnemyCredits &&
        !definition.blankFriendlyAdvantages &&
        !definition.searchMultiplier &&
        !definition.smuggle &&
        !definition.resourceSmuggle &&
        !definition.costReductions &&
        !definition.bounties &&
        !definition.exploit &&
        !definition.doubleTokensBySelfDefeat &&
        !definition.cannotAttack &&
        !definition.keywordSharing &&
        !definition.friendlyRaidMultiplier &&
        !definition.baseDamageLimit &&
        !definition.regroupReadyPower)
    ) {
      expect(card.text ?? '').toBe('');
      expect(card.keywords).toEqual([]);
    }
    if (definition.cardId in metaPins) {
      const pin = metaPins[definition.cardId]!;
      expect(card.text).toBe(pin.text);
      if (typeof pin.unique === 'boolean') expect(!!definition.unique).toBe(pin.unique);
      expect(card.keywords).toEqual(pin.keywords);
      if ('rules' in pin) expect(card.rules).toBe(pin.rules);
    }
    if (definition.cardId in triggerTexts) expect(card.text).toBe(triggerTexts[definition.cardId]);
    if (definition.kind === 'event') expect(card.cost).toBe(definition.cost);
    if (definition.kind === 'unit') {
      expect(card.cost).toBe(definition.cost);
      expect(card.power).toBe(definition.power);
      expect(card.arenas.map((s: string) => s.toLowerCase())).toEqual([definition.arena]);
      if (definition.piloting) {
        expect(definition.upgrade?.modifiers).toEqual({
          power: card.upgradePower,
          hp: card.upgradeHp,
        });
        expect(card.keywords).toContain('Piloting');
        expect(card.epicAction).toBe(
          definition.cardId in metaPins
            ? metaPins[definition.cardId]!.epicAction
            : pilotTexts[definition.cardId],
        );
      }
    }
    if (definition.kind === 'leader') {
      if (definition.faces.upgrade)
        expect(definition.faces.upgrade.modifiers).toEqual({
          power: card.upgradePower,
          hp: card.upgradeHp,
        });
      expect(card.cost).toBe(definition.printedCost);
      expect(card.power).toBe(definition.faces.unit?.power ?? null);
      if (definition.cardId in metaPins) {
        expect(card.epicAction).toBe(metaPins[definition.cardId]!.epicAction);
        expect(card.deployBox).toBe(metaPins[definition.cardId]!.deployBox);
      } else {
        expect(card.text).toBe('Action [exhaust]: Deal 1 damage to each base.');
        expect(card.deployBox).toBe('On Attack: Deal 1 damage to each enemy base.');
      }
    }
  }
  expect(() => cardDefinition('unimplemented-card')).toThrow();
  expect(Object.isFrozen(supportedCards)).toBe(true);
  expect(Object.isFrozen(supportedCards[0]?.aspects)).toBe(true);
});

const pilotTexts: Record<string, string> = {
  'clone-pilot':
    'Piloting [2 resources Command] (You may play this as an upgrade on a friendly Vehicle without a Pilot.)',
  'academy-graduate':
    'Piloting [2 resources Vigilance] (You may play this as an upgrade on a friendly Vehicle without a Pilot.)\nAttached unit gains Sentinel.',
  'astromech-pilot':
    'Piloting [2 resources Vigilance] (You may play this as an upgrade on a friendly Vehicle without a Pilot.)\nWhen played as an upgrade: You may heal 2 damage from a unit.',
};

// Printed text pins detect catalog drift; independent outcome cases live in
// triggers.test.ts. The supplied v8 rules define keyword behavior.
const triggerTexts: Record<string, string> = {
  'remnant-interceptor':
    "Support (When you play this unit, you may attack with another unit. It gains this unit's other abilities for this attack.)\nRestore 1 (When this unit attacks, heal 1 damage from your base.)",
  'honorable-nite-owl':
    "Support (When you play this unit, you may attack with another unit. It gains this unit's other abilities for this attack.)\nRaid 1 (This unit gets +1/+0 while attacking.)",
  'migs-mayfeld--how-about-a-toast-':
    'Support\nOn Attack: Deal 1 damage to the defending unit. If this unit is upgraded, deal 2 damage to the defending unit instead.',

  'latts-razzi--deadly-whipmaster':
    'When Played: Give a Shield token or an Experience token to this unit. Then, she deals damage equal to her power to an enemy ground unit.',
  'aggressive-negotiations':
    'Attack with a unit. For this attack, it gets +1/+0 for each card in your hand.',
  'surprise-strike': 'Attack with a unit. It gets +3/+0 for this attack.',
  'open-fire': 'Deal 4 damage to a unit.',
  recruit:
    'Search the top 5 cards of your deck for a unit, reveal it, and draw it. (Put the other cards on the bottom of your deck in a random order.)',
  'remnant-reserves':
    'Search the top 5 cards of your deck for up to 3 units, reveal them, and draw them. (Put the other cards on the bottom of your deck in a random order.)',
  'greef-karga--affable-commissioner':
    'When Played: Search the top 5 cards of your deck for an upgrade, reveal it, and draw it. (Put the other cards on the bottom of your deck in a random order.)',
  'sneak-attack':
    'Play a unit from your hand. It costs [3 resources] less and enters play ready. At the start of the regroup phase, defeat it.',
  shield:
    'If damage would be dealt to attached unit, prevent that damage. If you do, defeat a Shield token on it.',
  'outer-rim-constable': 'When Played: You may defeat an upgrade.',
  'imperial-armored-commando':
    'Sentinel (Enemy units in this arena must attack a Sentinel when they attack you.)\nShielded (When you play this unit, give a Shield token to it.)',
  'onyx-squadron-brute': 'When Defeated: Heal 2 damage from a base.',
  'hk-47--exclamation--die--meatbag-':
    "When an enemy unit is defeated: Deal 1 damage to its controller's base.",
  'green-leader--crynyd-s-sacrifice': 'When Defeated: You may deal 2 damage to a unit.',
  'snub-fighter-squadron':
    'Ambush (When you play this unit, it may attack an enemy unit.)\nWhen Played: Deal 1 damage to a space unit.',
  'superlaser-technician':
    'When Defeated: You may put this unit into play as a resource and ready it.',
};

test('every official Leader and Base has an implemented canonical definition', async () => {
  const catalog = await Bun.file(
    new URL('../../server/db/json/card-list.json', import.meta.url),
  ).json();
  const requested = Object.values(catalog).filter(
    (c: any) => c.type === 'Leader' || c.type === 'Base',
  ) as { cardId: string; type: string }[];
  expect(requested.filter(c => c.type === 'Leader')).toHaveLength(172);
  for (const card of requested)
    expect(cardDefinition(card.cardId).kind).toBe(card.type === 'Leader' ? 'leader' : 'base');
});

test('every canonical card with a LAW printing has a registered playable definition', async () => {
  const catalog = await Bun.file(
    new URL('../../server/db/json/card-list.json', import.meta.url),
  ).json();
  const cards = Object.values(catalog) as {
    cardId: string;
    variants: Record<string, { set: string }>;
  }[];
  const law = cards.filter(card =>
    Object.values(card.variants).some(variant => variant.set === 'law'),
  );
  expect(law).toHaveLength(267);
  for (const card of law) expect(() => cardDefinition(card.cardId)).not.toThrow();
});

test('every canonical card with a SEC printing has a registered playable definition', async () => {
  const catalog = await Bun.file(
    new URL('../../server/db/json/card-list.json', import.meta.url),
  ).json();
  const cards = Object.values(catalog) as {
    cardId: string;
    variants: Record<string, { set: string }>;
  }[];
  const sec = cards.filter(card =>
    Object.values(card.variants).some(variant => variant.set === 'sec'),
  );
  expect(sec).toHaveLength(266);
  for (const card of sec) expect(() => cardDefinition(card.cardId)).not.toThrow();
});

test('every canonical card with a LOF printing has a registered playable definition', async () => {
  const catalog = await Bun.file(
    new URL('../../server/db/json/card-list.json', import.meta.url),
  ).json();
  const cards = Object.values(catalog) as {
    cardId: string;
    variants: Record<string, { set: string }>;
  }[];
  const lof = cards.filter(card =>
    Object.values(card.variants).some(variant => variant.set === 'lof'),
  );
  expect(lof).toHaveLength(267);
  for (const card of lof) expect(() => cardDefinition(card.cardId)).not.toThrow();
});

test('every canonical card with a JTL printing has a registered playable definition', async () => {
  const catalog = await Bun.file(
    new URL('../../server/db/json/card-list.json', import.meta.url),
  ).json();
  const cards = Object.values(catalog) as {
    cardId: string;
    variants: Record<string, { set: string }>;
  }[];
  const jtl = cards.filter(card =>
    Object.values(card.variants).some(variant => variant.set === 'jtl'),
  );
  expect(jtl).toHaveLength(266);
  for (const card of jtl) expect(() => cardDefinition(card.cardId)).not.toThrow();
});
