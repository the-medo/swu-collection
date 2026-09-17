import { z } from 'zod';
import type {
  CardEffect,
  Condition,
  NumericValue,
  UnitFilter,
  CardFilter,
  InPlayFilter,
} from '../cards/definition.ts';
import { baselineVersions, compatibleVersions } from '../cards/catalog.ts';
export const versions = baselineVersions;
export const idSchema = z
  .string()
  .regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/)
  .refine(value => !['constructor', 'prototype', '__proto__'].includes(value));
export const cardIdSchema = z.string().min(1).max(120);
const count = z.number().int().nonnegative();
export const zoneSchema = z.enum([
  'base',
  'ground',
  'space',
  'deck',
  'hand',
  'resources',
  'discard',
  'set-aside',
  'captured',
]);
export type Zone = z.infer<typeof zoneSchema>;

export const conversionFilterSchema = z.strictObject({
  controller: z.enum(['friendly', 'enemy']).optional(),
  trait: z.string().min(1).optional(),
  anyTrait: z.array(z.string().min(1)).optional(),
  name: z.string().min(1).optional(),
  withoutPilot: z.boolean().optional(),
});
export const cardSchema = z.strictObject({
  instanceId: idSchema,
  cardId: cardIdSchema,
  leaderSide: z.literal('back').optional(),
  owner: idSchema,
  controller: idSchema,
  zone: zoneSchema,
  incarnation: count,
  visibility: count,
  damage: count,
  resourcesPaid: count.optional(),
  exhausted: z.boolean(),
  deployedAs: z.enum(['unit', 'upgrade']).nullable(),
  capturedBy: z.strictObject({ instanceId: idSchema, incarnation: count }).nullable(),
  attachedTo: z.strictObject({ instanceId: idSchema, incarnation: count }).nullable(),
  attachmentRestriction: z
    .union([
      z.strictObject({
        kind: z.literal('exact-host'),
        host: z.strictObject({ instanceId: idSchema, incarnation: count }),
      }),
      z.strictObject({ kind: z.literal('filter'), filter: conversionFilterSchema }),
    ])
    .optional(),
  abilityUses: z.record(idSchema, z.number().int().nonnegative()),
});
export type CardInstance = z.infer<typeof cardSchema>;
export const playerSchema = z.strictObject({
  id: idSchema,
  base: idSchema,
  leader: idSchema,
  tokens: z.array(idSchema),
  deck: z.array(idSchema),
  hand: z.array(idSchema),
  resources: z.array(idSchema),
  discard: z.array(idSchema),
});

const playIntentSchema = z.strictObject({
  kind: z.literal('play'),
  card: idSchema,
  target: idSchema.optional(),
  piloting: idSchema.optional(),
  smuggle: idSchema.optional(),
  plotPayment: z.literal('other-resources').optional(),
});
export const intentSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('choose-player'), playerId: idSchema }),
  z.strictObject({ kind: z.literal('initiative'), playerId: idSchema }),
  z.strictObject({ kind: z.literal('mulligan'), take: z.boolean() }),
  z.strictObject({ kind: z.literal('resource') }),
  z.strictObject({ kind: z.literal('cancel-resource') }),
  z.strictObject({ kind: z.literal('search') }),
  playIntentSchema,
  z.strictObject({ kind: z.literal('attack'), attacker: idSchema, defender: idSchema }),
  z.strictObject({
    kind: z.literal('use-ability'),
    card: idSchema,
    abilityId: idSchema,
    costTarget: idSchema.optional(),
  }),
  z.strictObject({ kind: z.literal('take-initiative') }),
  z.strictObject({ kind: z.literal('pass') }),
  z.strictObject({ kind: z.literal('trigger-player'), playerId: idSchema }),
  z.strictObject({ kind: z.literal('delayed-player'), playerId: idSchema }),
  z.strictObject({ kind: z.literal('delayed'), effectId: idSchema }),
  z.strictObject({ kind: z.literal('trigger'), triggerId: idSchema }),
  z.strictObject({ kind: z.literal('target'), card: idSchema }),
  z.strictObject({ kind: z.literal('choose-mode'), mode: idSchema }),
  z.strictObject({ kind: z.literal('choose-token'), token: z.enum(['shield', 'experience']) }),
  z.strictObject({ kind: z.literal('accept-effect') }),
  z.strictObject({ kind: z.literal('decline-effect') }),
  z.strictObject({ kind: z.literal('keep-unique'), card: idSchema }),
]);
export type Intent = z.infer<typeof intentSchema>;
export const decisionSchema = z.strictObject({
  id: idSchema,
  playerId: idSchema,
  kind: z.enum([
    'initiative',
    'mulligan',
    'resource',
    'action',
    'trigger-player',
    'trigger',
    'effect',
    'unique',
    'replacement',
    'search',
    'delayed-player',
    'delayed',
  ]),
  options: z.array(z.strictObject({ id: idSchema, intent: intentSchema })),
  selection: z
    .strictObject({
      cards: z.array(idSchema),
      min: count,
      max: count,
      budget: z
        .strictObject({
          stat: z.enum(['power', 'cost', 'remaining-hp']).optional(),
          max: count,
          costs: z.record(idSchema, count),
        })
        .optional(),
      allocation: z
        .strictObject({ limits: z.record(idSchema, count), quantum: count.positive().optional() })
        .optional(),
      disclose: z
        .strictObject({
          required: z.array(z.string().min(1)),
          icons: z.record(idSchema, z.array(z.string().min(1))),
        })
        .optional(),
    })
    .nullable(),
});
export type Decision = z.infer<typeof decisionSchema>;

export const simpleAbilitiesSchema = z.strictObject({
  smuggle: z
    .array(
      z.strictObject({
        id: idSchema,
        cost: count,
        aspects: z.array(
          z.enum(['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism', 'Villainy']),
        ),
      }),
    )
    .optional(),
  piloting: z
    .array(
      z.strictObject({
        id: idSchema,
        cost: count,
        aspects: z.array(
          z.enum(['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism', 'Villainy']),
        ),
      }),
    )
    .optional(),
  triggers: z
    .array(
      z.strictObject({
        id: idSchema,
        timing: z.enum(['attack', 'attacked', 'played']),
        optional: z.boolean().optional(),
        condition: z.lazy(() => conditionSchema).optional(),
        limit: z.enum(['once-per-round', 'once-per-phase']).optional(),
        effects: z.array(z.lazy(() => effectSchema)),
      }),
    )
    .optional(),
  bounties: z
    .array(z.strictObject({ id: idSchema, effects: z.array(z.lazy(() => effectSchema)) }))
    .optional(),
  surviveZeroHp: z.boolean().optional(),
  enemyAbilityImmunity: z.array(z.enum(['defeat', 'return-to-hand', 'exhaust'])).optional(),
  cannotReady: z.boolean().optional(),
  friendlyUnitsEnterReady: z.boolean().optional(),
  defenderCombatFirst: z.boolean().optional(),
  firstCombatDamage: z.boolean().optional(),
  keywords: z
    .array(
      z.enum([
        'Sentinel',
        'Shielded',
        'Support',
        'Grit',
        'Overwhelm',
        'Saboteur',
        'Ambush',
        'Hidden',
        'Plot',
        'Coordinate',
        'Fortify',
      ]),
    )
    .optional(),
  raid: count.optional(),
  restore: count.optional(),
  exploit: count.optional(),
});
export const abilityOriginSchema = z.strictObject({
  id: idSchema,
  card: cardSchema,
  profile: z.enum([
    'printed',
    'granted',
    'lasting',
    'aura',
    'attack-override',
    'attack-grant',
    'discarded-unit',
    'scheduled',
  ]),
  scheduledId: idSchema.optional(),
  auraId: idSchema.optional(),
  auraProfile: z.enum(['printed', 'granted']).optional(),
  abilities: simpleAbilitiesSchema.optional(),
  gritOnly: z.boolean().optional(),
  suppressed: z.boolean().optional(),
  keywordsSuppressed: z.boolean().optional(),
  lostKeywords: z.array(z.string()).optional(),
  resolved: z
    .strictObject({
      abilities: simpleAbilitiesSchema,
      losesKeywords: z.array(z.string()),
      power: z.number().int(),
      hp: z.number().int(),
    })
    .optional(),
  withoutSupport: z.boolean(),
});
export type AbilityOrigin = z.infer<typeof abilityOriginSchema>;
export const referenceSchema = z.strictObject({
  leaderSide: z.literal('back').optional(),
  instanceId: idSchema,
  incarnation: count,
  visibility: count,
  cardId: cardIdSchema,
});
export type CardReference = z.infer<typeof referenceSchema>;
export const triggerSchema = z.strictObject({
  bindings: z.record(idSchema, referenceSchema).optional(),
  groups: z.record(idSchema, z.array(referenceSchema)).optional(),
  values: z.record(idSchema, count).optional(),
  names: z.record(idSchema, z.string().min(1).max(512)).optional(),
  id: idSchema,
  playerId: idSchema,
  source: cardSchema,
  subject: cardSchema.optional(),
  abilityId: idSchema,
  abilities: z.array(abilityOriginSchema).min(1),
});
export type Trigger = z.infer<typeof triggerSchema>;
export const searchEffectSchema = z.strictObject({
  name: z.string().min(1).optional(),
  reveal: z.boolean().optional(),
  anyAspect: z
    .array(z.enum(['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism', 'Villainy']))
    .optional(),
  player: z.enum(['self', 'enemy']).optional(),
  bind: idSchema.optional(),
  after: z.lazy((): z.ZodType<CardEffect[]> => z.array(effectSchema)).optional(),
  afterEach: z.lazy((): z.ZodType<CardEffect[]> => z.array(effectSchema)).optional(),
  kind: z.literal('search-deck'),
  cardFilter: z.lazy(() => cardFilterSchema).optional(),
  hasKeyword: simpleAbilitiesSchema.shape.keywords.unwrap().element.optional(),
  destination: z.enum(['discard', 'deck-top']).optional(),
  afterEvenIfEmpty: z.boolean().optional(),
  count: z.lazy(() => numericValueSchema),
  filter: z.enum(['unit', 'upgrade', 'event', 'any']),
  trait: z.string().min(1).optional(),
  max: z.number().int().min(1).max(120),
  arena: z.enum(['ground', 'space']).optional(),
  maxTotalCost: count.optional(),
  attachesTo: idSchema.optional(),
  play: z
    .strictObject({
      discount: count,
      free: z.boolean().optional(),
      ready: z.boolean().optional(),
      after: z.lazy((): z.ZodType<CardEffect[]> => z.array(effectSchema)).optional(),
    })
    .optional(),
});
export const resolvedSearchEffectSchema = searchEffectSchema.extend({
  count: z.number().int().min(0).max(120),
});
export const cardFilterSchema: z.ZodType<CardFilter> = z.strictObject({
  otherThan: idSchema.optional(),
  sharesTraitWith: idSchema.optional(),
  sharesFriendlyUnitTrait: z.boolean().optional(),
  sharesFriendlyUnitAspect: z.boolean().optional(),
  withoutTrait: z.string().min(1).optional(),
  notName: z.string().min(1).optional(),
  costAtMost: z.lazy(() => numericValueSchema).optional(),
  owner: z.enum(['self', 'enemy']).optional(),
  hasKeyword: simpleAbilitiesSchema.shape.keywords.unwrap().element.optional(),
  printedKeyword: z
    .enum([
      'Sentinel',
      'Shielded',
      'Support',
      'Grit',
      'Overwhelm',
      'Saboteur',
      'Ambush',
      'Hidden',
      'Plot',
      'Coordinate',
    ])
    .optional(),
  differentNameFrom: z.array(idSchema).optional(),
  costLessThan: z.lazy(() => numericValueSchema).optional(),
  withoutAspect: z
    .enum(['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism', 'Villainy'])
    .optional(),
  name: z.string().min(1).optional(),
  inGroup: idSchema.optional(),
  playAs: z.enum(['upgrade', 'non-unit', 'pilot']).optional(),
  costParity: z.enum(['odd', 'even']).optional(),
  anyAspect: z
    .array(z.enum(['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism', 'Villainy']))
    .optional(),
  notKind: z.enum(['unit', 'upgrade', 'event']).optional(),
  arena: z.enum(['ground', 'space']).optional(),
  attachesTo: idSchema.optional(),
  sameNameAs: idSchema.optional(),
  named: idSchema.optional(),
  whenDefeated: z.boolean().optional(),
  defeatedThisPhase: z.boolean().optional(),
  maxPower: count.optional(),
  kind: z.enum(['unit', 'upgrade', 'event']).optional(),
  aspect: z
    .enum(['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism', 'Villainy'])
    .optional(),
  trait: z.string().optional(),
  anyTrait: z.array(z.string().min(1)).min(1).optional(),
  unique: z.boolean().optional(),
  maxCost: count.optional(),
  minCost: count.optional(),
  sharesAspectWith: idSchema.optional(),
});
export const inPlayFilterSchema: z.ZodType<InPlayFilter> = z.strictObject({
  unique: z.boolean().optional(),
  costParity: z.enum(['odd', 'even']).optional(),
  controller: z.enum(['friendly', 'enemy']),
  trait: z.string().min(1).optional(),
  otherThan: idSchema.optional(),
  roles: z.array(z.enum(['unit', 'upgrade', 'leader'])),
});
export const unitFilterSchema: z.ZodType<UnitFilter> = z.strictObject({
  noAbilities: z.boolean().optional(),
  sharesTraitWith: idSchema.optional(),
  sharesTraitWithGroup: idSchema.optional(),
  powerEquals: z.lazy(() => numericValueSchema).optional(),
  remainingHpEquals: z.lazy(() => numericValueSchema).optional(),
  damagedThisPhase: z.boolean().optional(),
  condition: z.lazy(() => conditionSchema).optional(),
  hasBounty: z.boolean().optional(),
  sameNameAs: idSchema.optional(),
  owner: z.enum(['self', 'enemy']).optional(),
  costEquals: z.lazy(() => numericValueSchema).optional(),
  minCost: count.optional(),
  defendingAgainst: z.lazy(() => unitFilterSchema).optional(),
  attackingAgainst: z.lazy(() => unitFilterSchema).optional(),
  attacking: z.enum(['any', 'unit', 'base']).optional(),
  costLessThan: z.lazy(() => numericValueSchema).optional(),
  upgradeTrait: z.string().min(1).optional(),
  mostPowerAmong: z.lazy(() => unitFilterSchema).optional(),
  mostCostAmong: z.lazy(() => unitFilterSchema).optional(),
  differentArenaFrom: idSchema.optional(),
  playedThisPhase: z.boolean().optional(),
  damageAtLeast: count.optional(),
  whenDefeated: z.boolean().optional(),
  inGroup: idSchema.optional(),
  notInGroup: idSchema.optional(),
  minKeywords: count.optional(),
  sharesNoAspectWithGroup: idSchema.optional(),
  otherThanAny: z.array(idSchema).optional(),
  anyOf: z.lazy(() => z.array(unitFilterSchema)).optional(),
  attackingUnit: idSchema.optional(),
  enteredThisPhase: z.boolean().optional(),
  sharesFriendlyLeaderTrait: z.boolean().optional(),
  withUpgrade: idSchema.optional(),
  withTokenUpgrade: z.boolean().optional(),
  sameAs: idSchema.optional(),
  defending: z.boolean().optional(),
  attackedThisPhase: z.boolean().optional(),
  attackedBaseThisPhase: z.boolean().optional(),
  withoutUpgrade: cardIdSchema.optional(),
  remainingHpLessThanPower: idSchema.optional(),
  remainingHpLessThan: idSchema.optional(),
  withoutPilot: z.boolean().optional(),
  dealtBaseDamage: z.boolean().optional(),
  leader: z.boolean().optional(),
  excludeName: z.string().min(1).optional(),
  hasKeyword: z
    .enum([
      'Sentinel',
      'Shielded',
      'Support',
      'Grit',
      'Overwhelm',
      'Saboteur',
      'Ambush',
      'Hidden',
      'Plot',
      'Coordinate',
      'Raid',
      'Restore',
    ])
    .optional(),
  powerAtLeast: count.optional(),
  costGreaterThan: idSchema.optional(),
  anyAspect: z
    .array(z.enum(['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism', 'Villainy']))
    .min(1)
    .optional(),
  name: z.string().min(1).optional(),
  powerAtMost: count.optional(),
  powerAtMostUnit: idSchema.optional(),
  arena: z.enum(['ground', 'space']).optional(),
  controller: z.enum(['friendly', 'enemy']).optional(),
  nonLeader: z.boolean().optional(),
  trait: z.string().min(1).optional(),
  maxCost: z.lazy(() => numericValueSchema).optional(),
  remainingHpAtLeast: count.optional(),
  remainingHpAtMost: count.optional(),
  damaged: z.boolean().optional(),
  upgraded: z.boolean().optional(),
  unique: z.boolean().optional(),
  token: z.boolean().optional(),
  anyTrait: z.array(z.string().min(1)).min(1).optional(),
  withoutTrait: z.string().min(1).optional(),
  exhausted: z.boolean().optional(),
  otherThan: idSchema.optional(),
  powerLessThan: idSchema.optional(),
  sameArenaAs: idSchema.optional(),
});
export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.enum(['numeric-greater', 'numeric-equal']),
      left: z.lazy(() => numericValueSchema),
      right: z.lazy(() => numericValueSchema),
    }),
    z.strictObject({
      kind: z.literal('numeric-at-least'),
      value: numericValueSchema,
      amount: count,
    }),
    z.strictObject({ kind: z.literal('unit-attacked-this-action'), target: idSchema }),
    z.strictObject({ kind: z.literal('card-role'), target: idSchema, role: z.literal('upgrade') }),
    z.strictObject({ kind: z.literal('card-ready'), target: idSchema }),
    z.strictObject({
      kind: z.enum(['discarded-this-phase', 'no-resources-paid']),
      target: idSchema,
    }),
    z.strictObject({
      kind: z.literal('unit-count-comparison'),
      relation: z.enum(['equal', 'more', 'less']),
    }),
    z.strictObject({
      kind: z.literal('played-card-this-phase'),
      filter: z.strictObject({
        kind: z.enum(['unit', 'upgrade', 'event']).optional(),
        notKind: z.enum(['unit', 'upgrade', 'event']).optional(),
        aspect: z
          .enum(['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism', 'Villainy'])
          .optional(),
        withoutAspect: z
          .enum(['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism', 'Villainy'])
          .optional(),
        trait: z.string().optional(),
      }),
      otherThan: idSchema.optional(),
    }),
    z.strictObject({
      kind: z.literal('unit-history-at-least'),
      leader: z.boolean().optional(),
      event: z.enum(['attacked', 'defeated', 'entered', 'left']),
      aspect: z
        .enum(['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism', 'Villainy'])
        .optional(),
      token: z.boolean().optional(),
      player: z.enum(['self', 'enemy', 'any']),
      amount: count,
      trait: z.string().optional(),
      otherThan: idSchema.optional(),
    }),

    z.strictObject({
      kind: z.literal('phase-event'),
      event: z.enum([
        'enemy-base-was-damaged',
        'friendly-upgrade-defeated',
        'own-base-attacked',
        'enemy-base-damaged',
        'indirect-damage',
        'token-created',
        'token-upgrade-given',
        'own-card-discarded',
      ]),
    }),
    z.strictObject({
      kind: z.literal('played-trait-this-phase'),
      traits: z.array(z.string().min(1)),
    }),
    z.strictObject({
      kind: z.literal('cards-played-this-phase-at-least'),
      player: z.enum(['self', 'enemy']),
      amount: count,
    }),
    z.strictObject({
      kind: z.literal('cards-in-play-at-least'),
      filter: inPlayFilterSchema,
      amount: count,
    }),
    z.strictObject({ kind: z.literal('attacking-unit'), filter: unitFilterSchema }),
    z.strictObject({
      kind: z.literal('unit-had-trait'),
      target: idSchema,
      trait: z.string().min(1),
    }),
    z.strictObject({ kind: z.literal('own-base-more-damaged') }),
    z.strictObject({ kind: z.literal('ambush-attack') }),
    z.strictObject({ kind: z.literal('attached-to-friendly-trait'), trait: z.string().min(1) }),
    z.strictObject({ kind: z.literal('phase'), phase: z.enum(['action', 'regroup']) }),
    z.strictObject({ kind: z.literal('controls-leader-trait'), trait: z.string().min(1) }),
    z.strictObject({ kind: z.literal('value-at-least'), name: idSchema, amount: count }),
    z.strictObject({
      kind: z.literal('resource-available'),
      player: z.enum(['self', 'enemy']),
      exhausted: z.boolean(),
    }),
    z.strictObject({
      kind: z.literal('attacked-with-trait'),
      trait: z.string().min(1),
      nonToken: z.boolean().optional(),
    }),
    z.strictObject({ kind: z.literal('always') }),
    z.strictObject({
      kind: z.literal('controls-base-trait'),
      trait: z.string().min(1),
      player: z.enum(['self', 'enemy', 'any']).optional(),
    }),
    z.strictObject({
      kind: z.literal('base-damage-at-least'),
      amount: count,
      player: z.enum(['self', 'enemy', 'any']).optional(),
    }),
    z.strictObject({ kind: z.literal('own-base-upgraded') }),
    z.strictObject({
      kind: z.literal('leader-or-base-aspect'),
      aspect: z.enum(['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism', 'Villainy']),
    }),
    z.strictObject({ kind: z.literal('enemy-last-action-attacked-base') }),
    z.strictObject({ kind: z.literal('round'), number: count.positive() }),
    z.strictObject({ kind: z.literal('different-costs'), targets: z.tuple([idSchema, idSchema]) }),
    z.strictObject({
      kind: z.literal('more-cards-than-opponent'),
      player: z.enum(['self', 'enemy']).optional(),
    }),
    z.strictObject({ kind: z.literal('card-matches'), target: idSchema, filter: cardFilterSchema }),
    z.strictObject({ kind: z.literal('fewer-resources-than-opponent') }),
    z.strictObject({ kind: z.literal('force-with-you') }),
    z.strictObject({ kind: z.enum(['all', 'any']), conditions: z.array(conditionSchema).min(1) }),
    z.strictObject({ kind: z.literal('not'), condition: conditionSchema }),
    z.strictObject({ kind: z.literal('no-other-unit-attacked'), target: idSchema }),
    z.strictObject({ kind: z.literal('controls-name'), name: z.string().min(1) }),
    z.strictObject({
      kind: z.literal('more-units-than-opponent'),
      arena: z.enum(['ground', 'space']).optional(),
    }),
    z.strictObject({ kind: z.literal('friendly-unit-defeated') }),
    z.strictObject({ kind: z.literal('unit-defeated'), target: idSchema }),
    z.strictObject({ kind: z.literal('attacking-damaged-unit') }),
    z.strictObject({
      kind: z.literal('discard-aspect'),
      aspect: z.enum(['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism', 'Villainy']),
    }),
    z.strictObject({ kind: z.literal('units-at-least'), filter: unitFilterSchema, amount: count }),
    z.strictObject({ kind: z.literal('units-at-most'), filter: unitFilterSchema, amount: count }),
    z.strictObject({
      kind: z.literal('opponent-has-more-units'),
      arena: z.enum(['ground', 'space']),
    }),
    z.strictObject({ kind: z.literal('initiative') }),
    z.strictObject({ kind: z.literal('initiative-unclaimed') }),
    z.strictObject({ kind: z.literal('unit-matches'), target: idSchema, filter: unitFilterSchema }),
  ]),
);
export const numericValueSchema: z.ZodType<NumericValue> = z.union([
  z.strictObject({
    kind: z.literal('unit-keyword-value'),
    target: idSchema,
    keyword: z.enum(['Raid', 'Restore']),
  }),
  z.strictObject({
    kind: z.literal('in-play-aspect-icons'),
    filter: inPlayFilterSchema,
    aspect: z.enum(['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism', 'Villainy']),
  }),
  z.strictObject({
    kind: z.literal('unit-sum'),
    filter: unitFilterSchema,
    stat: z.enum(['damage', 'upgrades']),
    multiplier: count.optional(),
  }),
  z.strictObject({ kind: z.literal('keyword-count'), target: idSchema }),
  z.strictObject({
    kind: z.literal('difference'),
    left: z.lazy(() => numericValueSchema),
    right: z.lazy(() => numericValueSchema),
  }),
  z.strictObject({
    kind: z.literal('floor-divide'),
    value: z.lazy(() => numericValueSchema),
    divisor: z.number().int().positive(),
  }),
  z.strictObject({
    kind: z.literal('phase-count'),
    event: z.enum(['cards-drawn', 'enemy-base-damage', 'hand-cards-discarded']),
    player: z.enum(['self', 'enemy']),
  }),
  z.strictObject({ kind: z.literal('group-size'), group: idSchema }),
  z.strictObject({
    kind: z.literal('group-stat-sum'),
    group: idSchema,
    stat: z.enum(['power', 'cost']),
  }),
  z.strictObject({
    kind: z.literal('product'),
    left: z.lazy(() => numericValueSchema),
    right: z.lazy(() => numericValueSchema),
  }),
  z.strictObject({
    kind: z.literal('conditional'),
    condition: z.lazy(() => conditionSchema),
    then: z.lazy(() => numericValueSchema),
    otherwise: z.lazy(() => numericValueSchema),
  }),
  z.strictObject({
    kind: z.literal('zone-size'),
    filter: cardFilterSchema.optional(),
    distinctBy: z.enum(['cost', 'name']).optional(),
    zone: z.enum(['hand', 'deck', 'discard', 'resources']),
    player: z.enum(['self', 'enemy']),
    multiplier: z.number().int().optional(),
  }),
  z.strictObject({
    kind: z.literal('printed-stat'),
    target: idSchema,
    stat: z.enum(['power', 'hp']),
  }),
  z.strictObject({ kind: z.literal('cards-in-play-count'), filter: inPlayFilterSchema }),
  z.strictObject({ kind: z.literal('credits-count'), player: z.enum(['self', 'enemy']) }),
  z.strictObject({
    kind: z.literal('unit-aspect-icons'),
    aspect: z.enum(['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism', 'Villainy']),
    filter: unitFilterSchema,
  }),
  z.strictObject({ kind: z.literal('force-uses-this-phase') }),
  z.strictObject({ kind: z.literal('cost-difference'), group: idSchema }),
  z.strictObject({ kind: z.literal('on-attack-count'), target: idSchema }),
  z.strictObject({ kind: z.literal('distinct-aspects'), target: idSchema }),
  z.strictObject({ kind: z.literal('unit-aspects'), filter: unitFilterSchema }),
  z.strictObject({
    kind: z.literal('base-damage-increase'),
    since: idSchema,
    divisor: z.number().int().positive(),
  }),
  z.strictObject({
    kind: z.literal('upgrades-count'),
    lastKnown: z.boolean().optional(),
    notCardId: cardIdSchema.optional(),
    cardId: cardIdSchema.optional(),
    target: idSchema,
    trait: z.string().min(1).optional(),
  }),
  z.strictObject({
    kind: z.literal('base-upgrades-count'),
    player: z.enum(['self', 'enemy']),
  }),
  z.strictObject({ kind: z.literal('card-cost'), target: idSchema }),
  z.strictObject({
    kind: z.enum(['ready-resources', 'spending-power']),
    player: z.enum(['self', 'enemy']),
  }),
  z.strictObject({ kind: z.literal('guarded-cards'), target: idSchema }),
  z.strictObject({
    kind: z.literal('unit-history-count'),
    player: z.enum(['self', 'enemy']),
    event: z.enum(['defeated', 'defeated-attacking']),
  }),
  z.number().int(),
  z.strictObject({
    kind: z.literal('unit-count'),
    filter: unitFilterSchema,
    distinctNames: z.boolean().optional(),
  }),
  z.strictObject({ kind: z.literal('own-base-damage'), divisor: z.number().int().positive() }),
  z.strictObject({ kind: z.literal('value'), name: idSchema, multiplier: count.optional() }),
  z.strictObject({
    kind: z.literal('unit-stat'),
    target: idSchema,
    stat: z.enum(['power', 'remaining-hp', 'damage']),
  }),
]);
export const abilityCostsSchema = z.array(
  z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('resources'), amount: count }),
    z.strictObject({ kind: z.literal('exhaust-self') }),
    z.strictObject({ kind: z.literal('defeat-self') }),
    z.strictObject({ kind: z.literal('damage-own-base'), amount: count.positive() }),
    z.strictObject({ kind: z.literal('exhaust-friendly-unit') }),
    z.strictObject({ kind: z.literal('force') }),
    z.strictObject({ kind: z.literal('discard-deck'), count: count.positive() }),
    z.strictObject({
      kind: z.literal('discard-hand'),
      count: count.positive(),
      filter: cardFilterSchema.optional(),
    }),
    z.strictObject({ kind: z.literal('defeat-resource') }),
    z.strictObject({ kind: z.literal('defeat-friendly-credit') }),
    z.strictObject({ kind: z.literal('defeat-friendly-token') }),
    z.strictObject({ kind: z.literal('ready-enemy-unit') }),
    z.strictObject({ kind: z.literal('defeat-friendly-upgrade') }),
    z.strictObject({ kind: z.literal('return-friendly-unit'), filter: unitFilterSchema }),
  ]),
);
export const modifyOperationSchema = z.strictObject({
  kind: z.literal('modify'),
  printedPower: count.optional(),
  printedHp: count.optional(),
  power: numericValueSchema,
  hp: numericValueSchema,
  abilities: simpleAbilitiesSchema.optional(),
  loseAbilities: z.boolean().optional(),
  loseKeywords: z.boolean().optional(),
  lostKeywords: z.array(simpleAbilitiesSchema.shape.keywords.unwrap().element).optional(),
  loseTraits: z.array(z.string().min(1)).optional(),
  cannotReady: z.boolean().optional(),
  cannotAttackBases: z.boolean().optional(),
  cannotBeAttacked: z.boolean().optional(),
  cannotDealCombatDamage: z.boolean().optional(),
  cannotHeal: z.boolean().optional(),
  surviveZeroHp: z.boolean().optional(),
  preventNextDamage: z.union([count, z.literal('all')]).optional(),
  preventAllDamage: z.boolean().optional(),
  skipRegroupReady: z.boolean().optional(),
  duration: z.enum(['phase', 'round', 'attack', 'source-in-play', 'next-regroup']),
});
export const unitOperationSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('take-control'),
    player: z.enum(['self', 'enemy', 'owner']),
    returnWhen: z.enum(['regroup', 'source-leaves']).optional(),
  }),
  z.strictObject({ kind: z.literal('move-arena'), arena: z.enum(['ground', 'space']) }),
  z.strictObject({
    kind: z.literal('heal'),
    amount: z.union([count, z.literal('all')]),
    countAs: idSchema.optional(),
  }),
  z.strictObject({
    kind: z.literal('damage'),
    unpreventable: z.boolean().optional(),
    amount: numericValueSchema,
    source: idSchema.optional(),
  }),
  z.strictObject({
    kind: z.enum(['exhaust', 'ready', 'return-to-hand', 'defeat', 'defeat-shields']),
  }),
  z.strictObject({
    kind: z.literal('give-token'),
    token: z.enum(['shield', 'experience', 'advantage', 'weakness']),
    count: numericValueSchema,
  }),
  modifyOperationSchema,
]);
export const distributeEffectSchema = z.strictObject({
  kind: z.literal('distribute'),
  exact: z.boolean().optional(),
  benefit: z.enum(['advantage', 'experience', 'weakness', 'heal', 'damage']),
  quantum: count.positive().optional(),
  amount: numericValueSchema,
  filter: unitFilterSchema,
  bind: idSchema,
  effects: z.lazy((): z.ZodType<CardEffect[]> => z.array(effectSchema)),
});
export const resolvedDistributeEffectSchema = distributeEffectSchema.extend({ amount: count });
export const zoneSearchEffectSchema = z.strictObject({
  kind: z.literal('search-zones'),
  zones: z
    .array(z.enum(['deck', 'hand']))
    .min(1)
    .max(2),
  player: z.enum(['self', 'enemy', 'bound-controller']),
  ownerOf: idSchema.optional(),
  filter: cardFilterSchema,
  to: z.literal('discard'),
});
export const inspectionEffectSchema = z.strictObject({
  kind: z.literal('inspect-zone'),
  onlyFromGroup: idSchema.optional(),
  top: count.max(120).optional(),
  reveal: z.boolean().optional(),
  group: idSchema.optional(),
  zone: z.enum(['hand', 'discard', 'resources', 'deck']),
  player: z.enum(['self', 'enemy', 'bound-controller']),
  ownerOf: idSchema.optional(),
  otherwise: z.lazy(() => z.array(effectSchema)).optional(),
  chooser: z.enum(['self', 'owner', 'enemy']),
  filter: cardFilterSchema,
  min: numericValueSchema,
  max: numericValueSchema,
  bind: idSchema,
  effects: z.lazy((): z.ZodType<CardEffect[]> => z.array(effectSchema)),
  after: z.lazy((): z.ZodType<CardEffect[]> => z.array(effectSchema)).optional(),
});
export const resolvedInspectionEffectSchema = inspectionEffectSchema.extend({
  min: count.max(120),
  max: count.max(120),
});
export const discloseEffectSchema = z.strictObject({
  kind: z.literal('disclose'),
  group: idSchema.optional(),
  otherwise: z.lazy((): z.ZodType<CardEffect[]> => z.array(effectSchema)).optional(),
  aspects: z
    .array(z.enum(['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism', 'Villainy']))
    .min(1)
    .max(6),
  player: z.enum(['self', 'enemy', 'defender']).optional(),
  effects: z.lazy((): z.ZodType<CardEffect[]> => z.array(effectSchema)),
});
export const effectSchema: z.ZodType<CardEffect> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('resource-cards'),
      group: idSchema,
      ready: z.boolean(),
      countAs: idSchema,
      effects: z.array(effectSchema),
    }),
    z.strictObject({
      kind: z.literal('schedule-resource-repayment'),
      amount: numericValueSchema,
      at: z.enum(['regroup', 'next-action']),
    }),

    z.strictObject({ kind: z.literal('repeat-defeated-batch'), index: idSchema }),
    z.strictObject({ kind: z.literal('repeat-defeated-ability'), index: idSchema }),
    z.strictObject({ kind: z.literal('repeat-attack-ability'), index: idSchema }),
    z.strictObject({ kind: z.literal('repeat-bounty'), index: idSchema }),
    z.strictObject({
      kind: z.literal('token-and-damage'),
      target: idSchema,
      token: z.literal('experience'),
      count: numericValueSchema,
      damage: numericValueSchema,
    }),
    z.strictObject({
      kind: z.literal('select-departed-upgrade'),
      target: idSchema,
      bind: idSchema,
      optional: z.boolean(),
      effects: z.array(effectSchema),
    }),
    z.strictObject({
      kind: z.literal('grant-keyword-until-source-leaves'),
      trait: idSchema,
      abilities: simpleAbilitiesSchema,
    }),
    z.strictObject({ kind: z.literal('exhaust-units'), filter: unitFilterSchema }),
    z.strictObject({ kind: z.literal('repeat-played-ability'), index: idSchema }),
    z.strictObject({
      kind: z.literal('schedule-phase-trigger'),
      id: idSchema,
      timing: z.enum(['initiative-taken', 'played-ability-used']),
      optional: z.boolean().optional(),
      effects: z.array(effectSchema),
    }),
    z.strictObject({ kind: z.literal('use-played-abilities'), filter: unitFilterSchema }),
    z.strictObject({
      kind: z.literal('friendly-units-damage-different-enemies'),
      amount: count.positive(),
    }),
    z.strictObject({ kind: z.literal('use-defeated-ability'), target: idSchema }),
    z.strictObject({
      kind: z.literal('schedule-regroup-victory'),
      arena: z.enum(['ground', 'space']),
    }),
    z.strictObject({ kind: z.literal('extra-action') }),
    z.strictObject({
      kind: z.literal('exchange-control'),
      first: idSchema,
      second: idSchema,
      effects: z.array(effectSchema),
    }),
    z.strictObject({
      kind: z.literal('defeat-credits'),
      countAs: idSchema,
      effects: z.array(effectSchema),
    }),
    z.strictObject({ kind: z.literal('after-attack'), effects: z.array(effectSchema) }),
    z.strictObject({ kind: z.literal('resource-departed'), target: idSchema }),
    z.strictObject({
      kind: z.literal('schedule-regroup-operation'),
      target: idSchema,
      operation: z.enum(['bottom', 'defeat']),
    }),
    z.strictObject({ kind: z.literal('prevent-base-healing') }),
    z.strictObject({ kind: z.literal('lose-enemy-trait'), trait: z.string().min(1) }),
    z.strictObject({ kind: z.literal('bottom-hand'), group: idSchema }),
    z.strictObject({
      kind: z.literal('restrict-play'),
      filter: cardFilterSchema,
      player: z.enum(['self', 'enemy']),
    }),
    z.strictObject({
      kind: z.literal('create-credits'),
      amount: numericValueSchema,
      player: z.enum(['self', 'enemy']).optional(),
    }),
    z.strictObject({
      kind: z.literal('defeat-credit'),
      controller: z.enum(['self', 'enemy', 'any']),
      optional: z.boolean(),
      effects: z.lazy((): z.ZodType<CardEffect[]> => z.array(effectSchema)),
    }),
    z.strictObject({
      kind: z.literal('take-control-upgrade'),
      target: idSchema,
      player: z.literal('attacker').optional(),
    }),
    z.strictObject({
      kind: z.literal('attach-self'),
      filter: conversionFilterSchema,
      optional: z.boolean(),
      effects: z.array(effectSchema).optional(),
    }),
    z.strictObject({
      kind: z.literal('return-unit-with-upgrades'),
      target: idSchema,
      upgrades: idSchema,
      freeNextCopy: z.boolean(),
    }),
    z.strictObject({ kind: z.literal('return-bound'), targets: z.array(idSchema) }),
    z.strictObject({
      kind: z.literal('attach-pilot'),
      host: idSchema,
      optional: z.boolean().optional(),
    }),
    z.strictObject({ kind: z.literal('detach-pilot') }),
    z.strictObject({ kind: z.literal('flip-leader') }),
    z.strictObject({ kind: z.literal('attach-leader') }),
    z.strictObject({ kind: z.literal('draw-card'), target: idSchema }),
    z.strictObject({
      kind: z.literal('reattach-upgrade'),
      chooser: z.literal('controller').optional(),
      target: idSchema,
      filter: unitFilterSchema.optional(),
    }),
    z.strictObject({ kind: z.literal('exhaust-leader'), effects: z.array(effectSchema) }),
    z.strictObject({ kind: z.literal('damage-chosen-bases'), amount: count }),
    discloseEffectSchema,
    z.strictObject({ kind: z.literal('plot-play') }),
    z.strictObject({ kind: z.literal('prevent-next-base-damage'), target: idSchema }),
    z.strictObject({
      kind: z.literal('heal-target'),
      target: idSchema,
      amount: numericValueSchema,
    }),
    z.strictObject({
      kind: z.literal('exhaust-bound'),
      targets: z.array(idSchema),
      countAs: idSchema,
      effects: z.array(effectSchema),
    }),
    z.strictObject({ kind: z.literal('defeat-resource'), target: idSchema }),
    z.strictObject({
      kind: z.literal('phase-play-cost'),
      player: z.enum(['self', 'enemy']),
      filter: cardFilterSchema,
      increase: count,
    }),
    z.strictObject({
      kind: z.literal('next-play'),
      discountIfSharesKeyword: z.boolean().optional(),
      using: z.enum(['plot', 'smuggle']).optional(),
      phaseAbilities: simpleAbilitiesSchema.optional(),
      filter: cardFilterSchema,
      discount: numericValueSchema.optional(),
      ready: z.boolean().optional(),
    }),
    z.strictObject({
      kind: z.literal('play-card'),
      player: z.enum(['self', 'enemy', 'owner']).optional(),
      sharesKeywordWith: idSchema.optional(),
      beforePlayed: z.array(effectSchema).optional(),
      otherwise: z.array(effectSchema).optional(),
      using: z.enum(['plot', 'smuggle']).optional(),
      bindHost: idSchema.optional(),
      ready: z.boolean().optional(),
      repeat: z.boolean().optional(),
      attachFilter: unitFilterSchema.optional(),
      phaseAbilities: simpleAbilitiesSchema.optional(),
      phaseAbilitiesWithCredit: simpleAbilitiesSchema.optional(),
      phaseDamagePrevention: count.positive().optional(),
      requirePlay: z.boolean().optional(),
      group: idSchema.optional(),
      attachTo: idSchema.optional(),
      ignoreOneColoredPenalty: z.boolean().optional(),
      ignoreAspectPenalties: z
        .union([
          z.boolean(),
          z.array(z.enum(['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism', 'Villainy'])),
        ])
        .optional(),
      replaceResource: z.boolean().optional(),
      takeControl: z.boolean().optional(),
      from: z.enum(['hand', 'discard', 'deck', 'resources']),
      target: idSchema.optional(),
      filter: cardFilterSchema,
      discount: numericValueSchema.optional(),
      free: z.boolean().optional(),
      optional: z.boolean(),
      bind: idSchema.optional(),
      effects: z.array(effectSchema).optional(),
    }),

    z.strictObject({
      kind: z.enum(['name-card', 'choose-number']),
      bind: idSchema,
      effects: z.lazy(() => z.array(effectSchema)),
    }),
    z.strictObject({
      kind: z.literal('restrict-named-card'),
      appliesTo: z.enum(['enemy', 'each']).optional(),
      duration: z.enum(['source-in-play', 'phase']).optional(),
      name: idSchema,
      restriction: z.enum(['prevent-play', 'lose-abilities']),
    }),
    z.strictObject({
      kind: z.literal('grant-discard-play'),
      target: idSchema,
      player: z.enum(['self', 'enemy']),
      free: z.boolean().optional(),
      discount: count.optional(),
      phaseAbilities: simpleAbilitiesSchema.optional(),
      ignoreAspectPenalties: z.boolean().optional(),
    }),
    z.strictObject({ kind: z.literal('schedule-return'), target: idSchema }),
    distributeEffectSchema,
    inspectionEffectSchema,
    zoneSearchEffectSchema,
    z.strictObject({
      kind: z.literal('reveal-deck-cards'),
      player: z.enum(['self', 'enemy']),
      count,
      group: idSchema,
      effects: z.array(effectSchema),
    }),
    z.strictObject({
      kind: z.literal('bottom-deck-group'),
      group: idSchema,
      from: z.literal('discard').optional(),
      countAs: idSchema.optional(),
      effects: z.array(effectSchema).optional(),
    }),
    z.strictObject({
      kind: z.literal('reveal-top'),
      player: z.enum(['self', 'enemy']),
      bind: idSchema,
      effects: z.array(effectSchema),
    }),
    z.strictObject({
      kind: z.literal('reveal-hand'),
      player: z.enum(['self', 'enemy']),
      count: z.strictObject({ filter: cardFilterSchema, bind: idSchema }).optional(),
      effects: z.array(effectSchema),
    }),
    z.strictObject({
      kind: z.literal('heal-units'),
      filter: unitFilterSchema,
      amount: z.union([count, z.literal('all')]),
    }),
    z.strictObject({
      kind: z.literal('reveal-card'),
      target: idSchema,
      from: z.literal('hand').optional(),
      effects: z.array(effectSchema).optional(),
    }),
    z
      .strictObject({
        kind: z.literal('random-card'),
        units: unitFilterSchema.optional(),
        targets: z.array(idSchema).min(1).max(120).optional(),
        group: idSchema.optional(),
        bind: idSchema,
        effects: z.array(effectSchema),
      })
      .refine(effect => [effect.targets, effect.group, effect.units].filter(Boolean).length === 1),
    z.strictObject({
      kind: z.literal('repeat-effects'),
      count: numericValueSchema,
      effects: z.array(effectSchema),
    }),
    z.strictObject({ kind: z.literal('random-discard'), ownerOf: idSchema }),
    z.strictObject({ kind: z.literal('discard-random-hand'), player: z.enum(['self', 'enemy']) }),
    z.strictObject({
      kind: z.literal('move-cards'),
      group: idSchema,
      from: z.enum(['hand', 'discard', 'deck', 'resources']),
      to: z.enum(['hand', 'discard']),
      filter: cardFilterSchema.optional(),
      discardBy: z.enum(['owner', 'enemy']).optional(),
    }),
    z.strictObject({
      kind: z.literal('move-card'),
      discardBy: z.literal('owner').optional(),
      fromPlayer: z.enum(['self', 'enemy']).optional(),
      target: idSchema,
      from: z.enum(['hand', 'discard', 'deck', 'resources']),
      to: z.enum(['hand', 'discard', 'deck-top', 'deck-bottom']),
      effects: z.array(effectSchema).optional(),
    }),
    z.strictObject({
      kind: z.literal('mill'),
      afterEvenIfEmpty: z.boolean().optional(),
      group: idSchema.optional(),
      player: z.enum(['self', 'enemy', 'defender']),
      count: count,
      bind: idSchema,
      effects: z.array(effectSchema),
    }),
    z.strictObject({ kind: z.literal('unit-to-deck'), target: idSchema }),
    z.strictObject({
      kind: z.literal('divide-damage'),
      after: z.array(effectSchema).optional(),
      source: idSchema.optional(),
      upTo: z.boolean().optional(),
      amount: numericValueSchema,
      filter: unitFilterSchema,
      optional: z.boolean(),
    }),
    z
      .strictObject({
        kind: z.literal('select-upgrades'),
        filter: z.strictObject({
          trait: z.string().min(1).optional(),
          hostKind: z.enum(['unit', 'base']).optional(),
          cardId: cardIdSchema.optional(),
          maxCost: count.optional(),
          token: z.boolean().optional(),
          controller: z.enum(['friendly', 'enemy']).optional(),
          sameAs: idSchema.optional(),
          withoutTrait: z.string().min(1).optional(),
          attachedTo: idSchema.optional(),
          otherThan: idSchema.optional(),
          nonLeader: z.boolean().optional(),
          unique: z.boolean().optional(),
        }),
        min: z.union([count, z.literal('all')]),
        max: z.union([count, z.literal('all')]),
        bind: idSchema,
        effects: z.array(effectSchema),
      })
      .refine(
        effect => effect.min !== 'all' || effect.max === 'all',
        'All-upgrade selection requires an unlimited maximum',
      ),
    z.strictObject({
      kind: z.literal('move-upgrades'),
      group: idSchema,
      to: z.enum(['discard', 'hand']),
      bindHost: idSchema.optional(),
      effects: z.array(effectSchema).optional(),
    }),
    z.strictObject({
      kind: z.literal('select-resources'),
      chooser: z.enum(['self', 'owner']).optional(),
      player: z.enum(['self', 'enemy']),
      exhausted: z.union([z.boolean(), z.literal('any')]),
      min: numericValueSchema,
      max: z.union([numericValueSchema, z.literal('all')]),
      operation: z.enum(['ready', 'exhaust', 'defeat', 'inspect']),
      group: idSchema.optional(),
      countAs: idSchema.optional(),
      effects: z.array(effectSchema).optional(),
    }),
    z.strictObject({
      kind: z.literal('defeat-tokens'),
      countAs: idSchema,
      effects: z.array(effectSchema),
    }),
    z.strictObject({ kind: z.literal('take-enemy-credit') }),
    z.strictObject({ kind: z.literal('gain-force') }),
    z.strictObject({
      kind: z.literal('indirect-damage'),
      after: z.array(effectSchema).optional(),
      amount: numericValueSchema,
      recipient: z.enum(['chosen', 'enemy', 'defender']),
    }),
    z.strictObject({
      kind: z.literal('modify-units'),
      filter: unitFilterSchema,
      operation: modifyOperationSchema,
    }),
    z.strictObject({
      kind: z.literal('phase-stat-modifier'),
      filter: unitFilterSchema,
      power: z.number().int(),
      hp: z.number().int(),
    }),
    z.strictObject({
      kind: z.literal('with-value'),
      name: idSchema,
      value: numericValueSchema,
      effects: z.array(effectSchema),
    }),
    z.strictObject({
      kind: z.literal('resource-top'),
      ready: z.boolean().optional(),
      optional: z.boolean(),
      player: z.enum(['self', 'enemy']).optional(),
    }),
    z.strictObject({
      kind: z.literal('select-target'),
      units: unitFilterSchema.optional(),
      bases: z.enum(['any', 'friendly', 'enemy']).optional(),
      baseRemainingHpAtMost: count.optional(),
      otherThan: idSchema.optional(),
      chooser: z.enum(['self', 'enemy']).optional(),
      chooserOf: idSchema.optional(),
      bind: idSchema,
      optional: z.boolean(),
      effects: z.array(effectSchema),
    }),
    z.strictObject({
      kind: z.literal('damage-target'),
      target: idSchema,
      amount: numericValueSchema,
      excessToEnemyBase: z.boolean().optional(),
      source: idSchema.optional(),
    }),
    z.strictObject({
      kind: z.literal('create-unit'),
      creatorOf: idSchema.optional(),
      player: z.enum(['self', 'enemy']).optional(),
      group: idSchema.optional(),
      phaseAbilities: simpleAbilitiesSchema.optional(),
      cardId: cardIdSchema,
      count: numericValueSchema,
      bind: idSchema.optional(),
      effects: z.array(effectSchema).optional(),
    }),
    z.strictObject({
      kind: z.literal('select-units'),
      filter: unitFilterSchema,
      bind: idSchema,
      remainingHpBudget: count.optional(),
      budget: z
        .strictObject({ stat: z.enum(['power', 'cost']), max: numericValueSchema })
        .optional(),
      min: numericValueSchema.optional(),
      max: numericValueSchema.optional(),
      effects: z.array(effectSchema),
    }),
    z.strictObject({
      kind: z.literal('defeat-group'),
      group: idSchema,
      countAs: idSchema,
      effects: z.array(effectSchema),
    }),
    z.strictObject({ kind: z.literal('defeat-bound'), targets: z.array(idSchema).min(1) }),
    z.strictObject({
      kind: z.literal('damage-bound'),
      targets: z.array(idSchema).min(1),
      amount: count,
    }),
    z.strictObject({
      kind: z.literal('pay'),
      player: z.enum(['self', 'enemy']).optional(),
      otherwise: z.array(effectSchema).optional(),
      costs: abilityCostsSchema,
      optional: z.boolean(),
      effects: z.array(effectSchema),
    }),
    z.strictObject({ kind: z.literal('defeat-self-upgrade') }),
    z.strictObject({ kind: z.literal('defeat-target'), target: idSchema }),
    z.strictObject({
      kind: z.literal('choose-mode'),
      private: z.boolean().optional(),
      chooser: z.enum(['self', 'enemy']).optional(),
      chooserOf: idSchema.optional(),
      repeat: count.positive().max(10).optional(),
      options: z
        .array(
          z.strictObject({
            id: idSchema,
            condition: conditionSchema.optional(),
            effects: z.array(effectSchema),
          }),
        )
        .min(1),
    }),
    z.strictObject({
      kind: z.literal('if'),
      condition: conditionSchema,
      effects: z.array(effectSchema),
      otherwise: z.array(effectSchema).optional(),
    }),
    z.strictObject({
      kind: z.literal('select-unit'),
      leastRemainingHp: z.boolean().optional(),
      forAttack: z
        .strictObject({
          unitsOnly: z.boolean().optional(),
          evenIfExhausted: z.boolean().optional(),
        })
        .optional(),
      otherwise: z.array(effectSchema).optional(),
      chooser: z.enum(['self', 'enemy']).optional(),
      chooserOf: idSchema.optional(),
      allowMissing: z.boolean().optional(),
      filter: unitFilterSchema,
      bind: idSchema,
      optional: z.boolean(),
      effects: z.array(effectSchema),
    }),
    z.strictObject({
      kind: z.literal('exhaust-group'),
      group: idSchema,
      countAs: idSchema.optional(),
      effects: z.array(effectSchema).optional(),
    }),
    z.strictObject({ kind: z.literal('ready-units'), filter: unitFilterSchema }),
    z.strictObject({
      kind: z.literal('units-damage-target'),
      target: idSchema,
      filter: unitFilterSchema,
    }),
    z.strictObject({ kind: z.literal('capture-pairs') }),
    z.strictObject({
      kind: z.literal('attack-series'),
      filter: unitFilterSchema,
      unitsOnly: z.boolean(),
      evenIfExhausted: z.boolean(),
    }),
    z.strictObject({ kind: z.literal('capture-group'), guard: idSchema, group: idSchema }),
    z.strictObject({ kind: z.literal('ready-leader'), optional: z.boolean() }),
    z.strictObject({
      kind: z.literal('capture-unit'),
      from: z.literal('discard').optional(),
      guard: idSchema,
      target: idSchema,
      rescueAtRegroup: z.boolean().optional(),
    }),
    z.strictObject({
      kind: z.literal('look-deck'),
      minDiscard: count.max(1).optional(),
      player: z.enum(['self', 'enemy']).optional(),
      count: count,
      mode: z.enum(['discard-one', 'bottom-any']),
    }),
    z.strictObject({
      kind: z.literal('each-unit'),
      filter: unitFilterSchema,
      bind: idSchema,
      effects: z.array(effectSchema),
    }),
    z.strictObject({
      kind: z.literal('on-unit'),
      creatorOf: idSchema.optional(),
      target: idSchema,
      operation: unitOperationSchema,
      ifYouDo: z.array(effectSchema).optional(),
    }),
    z.strictObject({
      kind: z.literal('attack-bound'),
      preventDamage: z.boolean().optional(),
      defenderPowerModifier: z.number().int().optional(),
      gainsAbilitiesOf: idSchema.optional(),
      blankDefender: z.boolean().optional(),
      damageStat: z.literal('remaining-hp').optional(),
      swapRaidRestore: z.boolean().optional(),
      cannotAttackBases: z.boolean().optional(),
      evenIfExhausted: z.boolean().optional(),
      after: z.array(effectSchema).optional(),
      combatFirst: conditionSchema.optional(),
      unitsOnly: z.boolean().optional(),
      target: idSchema,
      optional: z.boolean(),
      powerBonus: numericValueSchema.optional(),
      abilities: simpleAbilitiesSchema.optional(),
    }),
    z.strictObject({
      kind: z.literal('damage-bases'),
      amount: count,
      targets: z.enum(['each', 'enemy']),
    }),
    z.strictObject({
      kind: z.literal('damage-unit'),
      amount: z.union([count, z.enum(['source-power', 'hand-size', 'remaining-hp-minus-one'])]),
      filter: unitFilterSchema.optional(),
      controller: z.literal('enemy').optional(),
      arena: z.enum(['ground', 'space', 'any']),
      optional: z.boolean(),
    }),
    z.strictObject({ kind: z.literal('heal-base'), amount: count }),
    z.strictObject({ kind: z.literal('heal-unit'), amount: count, optional: z.boolean() }),
    z.strictObject({
      kind: z.literal('self-resource'),
      ready: z.boolean().optional(),
      optional: z.boolean().optional(),
    }),
    z.strictObject({
      kind: z.literal('draw-cards'),
      amount: numericValueSchema,
      player: z.enum(['self', 'enemy']).optional(),
    }),
    z.strictObject({ kind: z.literal('damage-base'), amount: count }),
    z.strictObject({ kind: z.literal('damage-own-base'), amount: numericValueSchema }),
    z.strictObject({
      kind: z.literal('damage-units'),
      after: z.array(effectSchema).optional(),
      bind: idSchema.optional(),
      amount: numericValueSchema,
      source: idSchema.optional(),
      filter: unitFilterSchema,
      max: numericValueSchema.optional(),
      mandatory: z.boolean().optional(),
    }),
    z.strictObject({
      kind: z.literal('defeat-unit'),
      filter: unitFilterSchema,
      optional: z.boolean(),
      healOwnBase: count.optional(),
    }),
    z.strictObject({
      kind: z.literal('defeat-units'),
      filter: unitFilterSchema,
      damageEnemyBase: count.optional(),
    }),
    z.strictObject({ kind: z.literal('defeat-defender-shields') }),
    z.strictObject({ kind: z.literal('ambush') }),
    z.strictObject({ kind: z.literal('support') }),
    z.strictObject({
      kind: z.literal('heal-own-base'),
      amount: numericValueSchema,
      player: z.enum(['self', 'enemy']).optional(),
    }),
    z.strictObject({ kind: z.literal('damage-defender'), amount: count, upgradedAmount: count }),
    z.strictObject({
      kind: z.literal('play-unit'),
      discount: count,
      ready: z.boolean(),
      defeatAtRegroup: z.boolean(),
    }),
    searchEffectSchema,
    z.strictObject({
      kind: z.literal('attack-with-unit'),
      redirectExcess: z.boolean().optional(),
      filter: unitFilterSchema.optional(),
      grantSourceTriggers: z.boolean().optional(),
      powerBonus: z.union([count, z.literal('hand-size')]),
    }),
    z.strictObject({ kind: z.literal('schedule-next-action'), effects: z.array(effectSchema) }),
    z.strictObject({ kind: z.literal('schedule-regroup-effects'), effects: z.array(effectSchema) }),
    z.strictObject({
      kind: z.literal('tax-units'),
      player: z.enum(['self', 'enemy']),
      amount: count.positive(),
    }),
    z.strictObject({ kind: z.literal('choose-self-token') }),
    z.strictObject({ kind: z.literal('copy-token'), upgrade: idSchema, target: idSchema }),
    z.strictObject({
      kind: z.literal('give-self-token'),
      token: z.enum(['shield', 'experience', 'weakness']),
    }),
    z.strictObject({
      kind: z.literal('defeat-upgrade'),
      optional: z.boolean(),
      attachedTo: idSchema.optional(),
      nonUnique: z.boolean().optional(),
    }),
    z.strictObject({
      kind: z.literal('deploy'),
      as: z.enum(['unit', 'unit-or-upgrade']),
      condition: z
        .strictObject({
          kind: z.literal('resources-at-least'),
          amount: count,
          reducedBy: numericValueSchema.optional(),
        })
        .nullable(),
    }),
  ]),
);

export const lastingSchema = z.strictObject({
  printedPower: count.optional(),
  printedHp: count.optional(),
  id: idSchema,
  source: cardSchema,
  target: referenceSchema,
  power: z.number().int(),
  hp: z.number().int(),
  abilities: simpleAbilitiesSchema.optional(),
  loseAbilities: z.boolean(),
  loseKeywords: z.boolean().optional(),
  lostKeywords: z.array(simpleAbilitiesSchema.shape.keywords.unwrap().element).optional(),
  loseTraits: z.array(z.string().min(1)).optional(),
  cannotReady: z.boolean().optional(),
  cannotAttackBases: z.boolean().optional(),
  cannotBeAttacked: z.boolean().optional(),
  cannotDealCombatDamage: z.boolean().optional(),
  cannotHeal: z.boolean().optional(),
  surviveZeroHp: z.boolean().optional(),
  preventNextDamage: z.union([count, z.literal('all')]).optional(),
  preventAllDamage: z.boolean().optional(),
  skipRegroupReady: z.boolean().optional(),
  expires: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('next-regroup'), round: count }),
    z.strictObject({ kind: z.literal('round'), round: count }),
    z.strictObject({ kind: z.literal('source-in-play') }),
    z.strictObject({
      kind: z.literal('phase'),
      round: count,
      phase: z.enum(['action', 'regroup']),
    }),
    z.strictObject({ kind: z.literal('attack'), attackId: idSchema }),
  ]),
});
export const attackSchema = z.strictObject({
  excessToUnit: z
    .strictObject({ source: cardSchema, arena: z.enum(['ground', 'space']) })
    .optional(),
  routedExcess: referenceSchema.optional(),
  order: z.enum(['simultaneous', 'attacker-first', 'defender-first']).optional(),
  damageStat: z.literal('remaining-hp').optional(),
  swapRaidRestore: z.boolean().optional(),
  baseDamageSources: z.array(referenceSchema),
  after: z.lazy(() => z.array(effectFrameSchema)).optional(),
  ambush: z.boolean(),
  attackerFirst: z.boolean(),
  ending: z
    .strictObject({
      source: cardSchema,
      abilities: z.array(abilityOriginSchema),
      observers: z.array(
        z.strictObject({ source: cardSchema, origins: z.array(abilityOriginSchema) }),
      ),
    })
    .optional(),
  combatDamage: z.array(
    z.strictObject({ source: referenceSchema, target: referenceSchema, amount: count }),
  ),
  defeated: z.array(referenceSchema),
  id: idSchema,
  attacker: referenceSchema,
  defender: referenceSchema,
  defendingPlayer: idSchema,
  removedFromCombat: z.array(referenceSchema),
  powerBonus: count,
  grantedAbilities: z.array(abilityOriginSchema),
});
export const damageAssignmentSchema = z.strictObject({
  redirectedAmount: count.positive().optional(),
  excessRoute: z
    .strictObject({
      source: cardSchema,
      arena: z.enum(['ground', 'space']),
      overwhelm: z.boolean(),
      whole: z.boolean(),
    })
    .optional(),
  originalAmount: count.optional(),
  replacements: z
    .array(
      z.strictObject({
        kind: z.enum(['double', 'prevent-next', 'prevent', 'increase']),
        abilityId: idSchema.optional(),
        source: referenceSchema,
        lastingId: idSchema.optional(),
        amount: count.positive(),
      }),
    )
    .optional(),
  preventionDeclined: z.boolean().optional(),
  declinedReplacements: z
    .array(z.strictObject({ source: referenceSchema, abilityId: idSchema }))
    .optional(),
  optionalReplacement: z.strictObject({ source: referenceSchema, abilityId: idSchema }).optional(),
  prevention: z
    .strictObject({ kind: z.enum(['sacrifice-trait', 'shield-other']), source: referenceSchema })
    .optional(),
  unpreventable: z.boolean().optional(),
  indirect: z.boolean().optional(),
  target: referenceSchema,
  amount: count,
  source: cardSchema.nullable(),
  preventedBy: referenceSchema.nullable(),
  excess: z.strictObject({ target: referenceSchema, amount: count }).optional(),
});
const regroupDelayedSchema = z.strictObject({
  origin: abilityOriginSchema.optional(),
  id: idSchema,
  playerId: idSchema,
  source: cardSchema,
  target: referenceSchema,
  dueRound: z.number().int().positive(),
  kind: z.enum([
    'defeat-at-regroup',
    'return-at-regroup',
    'rescue-at-regroup',
    'control-at-regroup',
    'control-on-departure',
  ]),
});
export const delayedSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('regroup-operation'),
    id: idSchema,
    playerId: idSchema,
    source: cardSchema,
    target: referenceSchema,
    dueRound: count.positive(),
    operation: z.enum(['bottom', 'defeat']),
    origin: abilityOriginSchema.optional(),
  }),
  z.strictObject({
    kind: z.literal('resources-at-regroup'),
    id: idSchema,
    playerId: idSchema,
    source: cardSchema,
    target: z.null(),
    dueRound: count.positive(),
    amount: count.positive().max(120),
    origin: abilityOriginSchema.optional(),
  }),
  z.strictObject({
    kind: z.literal('resources-at-action'),
    id: idSchema,
    playerId: idSchema,
    source: cardSchema,
    target: z.null(),
    dueRound: count.positive(),
    amount: count.positive().max(120),
    origin: abilityOriginSchema.optional(),
  }),
  regroupDelayedSchema,
  z.strictObject({
    id: idSchema,
    playerId: idSchema,
    source: cardSchema,
    target: z.null(),
    dueRound: z.number().int().positive(),
    kind: z.literal('victory-at-regroup'),
    arena: z.enum(['ground', 'space']),
  }),
  z.strictObject({
    id: idSchema,
    playerId: idSchema,
    source: cardSchema,
    target: z.null(),
    dueRound: z.number().int().positive(),
    kind: z.literal('effects-at-action'),
    effects: z.array(effectSchema),
  }),
  z.strictObject({
    id: idSchema,
    playerId: idSchema,
    source: cardSchema,
    target: z.null(),
    dueRound: z.number().int().positive(),
    kind: z.literal('effects-at-regroup'),
    effects: z.array(effectSchema),
  }),
]);
export type DelayedEffect = z.infer<typeof delayedSchema>;
const searchFields = {
  origin: abilityOriginSchema.optional(),
  bindings: z.record(idSchema, referenceSchema).optional(),
  groups: z.record(idSchema, z.array(referenceSchema)).optional(),
  values: z.record(idSchema, count).optional(),
  names: z.record(idSchema, z.string().min(1).max(512)).optional(),
  playerId: idSchema,
  source: cardSchema,
  effect: resolvedSearchEffectSchema,
  cards: z.array(referenceSchema).min(1).max(120),
};
const effectFrameSchema = z.strictObject({
  kind: z.literal('effect'),
  origin: abilityOriginSchema.optional(),
  playerId: idSchema,
  source: cardSchema,
  effect: effectSchema,
  bindings: z.record(idSchema, referenceSchema).optional(),
  groups: z.record(idSchema, z.array(referenceSchema)).optional(),
  values: z.record(idSchema, count).optional(),
  names: z.record(idSchema, z.string().min(1).max(512)).optional(),
});
export const tokenCreationSchema = z.strictObject({
  ...effectFrameSchema.omit({ kind: true, effect: true }).shape,
  kind: z.literal('create-tokens'),
  simultaneousDamage: z.strictObject({ target: referenceSchema, amount: count }).optional(),
  creator: idSchema,
  declined: z.boolean().optional(),
  replacements: z.array(referenceSchema),
  creation: z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('unit'),
      cardId: cardIdSchema,
      count: count,
      phaseAbilities: simpleAbilitiesSchema.optional(),
    }),
    z.strictObject({
      kind: z.literal('upgrade'),
      token: z.enum(['shield', 'experience', 'advantage', 'weakness']),
      targets: z.array(z.strictObject({ target: referenceSchema, count: count })),
    }),
    z.strictObject({ kind: z.enum(['credits', 'force']), recipient: idSchema, count: count }),
  ]),
  after: z.array(effectSchema).optional(),
  bind: idSchema.optional(),
  countAs: idSchema.optional(),
  group: idSchema.optional(),
});
export type TokenCreationFrame = z.infer<typeof tokenCreationSchema>;

const departedUnitSchema = z.strictObject({
  printedPower: count,
  printedHp: count,
  traits: z.array(z.string().min(1)),
  leaderUnit: z.boolean(),
  reference: referenceSchema,
  controller: idSchema,
  power: count,
  hp: count,
  damage: count,
  arena: z.enum(['ground', 'space']),
  upgraded: z.boolean(),
  upgrades: z.array(cardSchema),
  abilities: z.array(abilityOriginSchema).min(1),
});
const observerSchema = z.strictObject({
  source: cardSchema,
  origins: z.array(abilityOriginSchema).min(1),
});
const departureSchema = z.strictObject({
  unit: departedUnitSchema,
  observers: z.array(observerSchema),
  leftObservers: z.array(observerSchema),
});
export const defeatPreparationSchema = z.strictObject({
  departures: z.array(departureSchema),
  observers: z.array(observerSchema),
});
export type DefeatPreparation = z.infer<typeof defeatPreparationSchema>;

const unitTaxSchema = z.strictObject({
  kind: z.literal('unit-tax'),
  playerId: idSchema,
  chooser: idSchema,
  source: cardSchema,
  amount: count.positive(),
  cards: z.array(referenceSchema).min(1),
});
export const afterDamageSchema = z.strictObject({
  playerId: idSchema,
  source: cardSchema,
  effects: z.array(effectSchema),
  bindings: z.record(idSchema, referenceSchema).optional(),
  groups: z.record(idSchema, z.array(referenceSchema)).optional(),
  values: z.record(idSchema, count).optional(),
  names: z.record(idSchema, z.string().min(1)).optional(),
});
const actionFrameSchema = z.strictObject({
  kind: z.literal('action'),
  extraActions: count.optional(),
});
const abilityPaymentSchema = z.strictObject({
  kind: z.literal('ability-payment'),
  playerId: idSchema,
  source: cardSchema,
  intent: intentSchema,
  continuation: z.discriminatedUnion('kind', [actionFrameSchema, effectFrameSchema]),
});
const exploitPlaySchema = z.strictObject({ kind: z.literal('exploit-play'), playerId: idSchema });
const playPaymentSchema = z.strictObject({
  playerId: idSchema,
  source: cardSchema,
  intent: playIntentSchema,
  continuation: abilityPaymentSchema.shape.continuation,
  stage: z.enum(['free', 'units', 'defeats', 'special', 'credits', 'play']),
  specialBeforeExploit: z.literal(true).optional(),
  special: z
    .strictObject({
      selected: z.array(cardSchema),
      discount: count,
      phaseAbilities: simpleAbilitiesSchema.optional(),
    })
    .optional(),
  freeOffer: z
    .strictObject({ normal: z.boolean(), choice: z.enum(['free', 'normal']).optional() })
    .optional(),
  maximum: count,
  increased: count,
  reductions: z.record(z.string().min(1), count),
  remaining: count,
  selected: z.array(cardSchema),
  modifiers: z.array(idSchema),
  rollback: z.string().min(1).max(8_000_000),
});
export type PlayPayment = z.infer<typeof playPaymentSchema>;
export const frameSchema = z.discriminatedUnion('kind', [
  exploitPlaySchema,
  z.strictObject({ kind: z.literal('free-play-choice'), playerId: idSchema }),
  z.strictObject({ kind: z.literal('exploit-payment'), playerId: idSchema }),
  z.strictObject({
    kind: z.literal('special-play-payment'),
    playerId: idSchema,
    intent: playIntentSchema,
    source: cardSchema,
    mode: z.enum(['defeat-resources', 'damage-units', 'bottom-discard']),
    cards: z.array(referenceSchema),
    min: count,
    max: count,
    discountEach: count,
  }),
  z.strictObject({
    kind: z.literal('different-unit-damage'),
    declaration: effectFrameSchema.extend({
      effect: z.strictObject({
        kind: z.literal('friendly-units-damage-different-enemies'),
        amount: count.positive(),
      }),
    }),
    units: z.array(cardSchema),
    playerId: idSchema,
    source: cardSchema,
    dealers: z.array(referenceSchema),
    targets: z.array(referenceSchema),
    usedTargets: z.array(referenceSchema),
    index: count,
    amount: count.positive(),
  }),
  z.strictObject({
    ...effectFrameSchema.omit({ kind: true, effect: true }).shape,
    kind: z.literal('random-card'),
    cards: z.array(referenceSchema).min(1).max(120),
    bind: idSchema,
    effects: z.array(effectSchema),
  }),
  z.strictObject({
    kind: z.literal('unit-defeat'),
    prepared: defeatPreparationSchema.optional(),
    cards: z.array(cardSchema).min(1),
    pending: z.array(referenceSchema),
    combatDamaged: z.array(referenceSchema),
    source: cardSchema.optional(),
  }),
  z.strictObject({
    kind: z.literal('upgrade-defeat'),
    card: cardSchema,
    origins: z.array(abilityOriginSchema).min(1),
    observers: z.array(
      z.strictObject({ source: cardSchema, origins: z.array(abilityOriginSchema).min(1) }),
    ),
  }),
  z.strictObject({
    kind: z.literal('base-upgrade-protection'),
    card: cardSchema,
    protectors: z.array(cardSchema).min(1),
    observers: z.array(observerSchema),
  }),
  z.strictObject({
    kind: z.literal('convert-pilot'),
    restriction: conversionFilterSchema.optional(),
    source: cardSchema,
    playerId: idSchema,
    pilot: referenceSchema,
    host: referenceSchema,
  }),
  tokenCreationSchema,
  z.strictObject({
    kind: z.literal('combat-order'),
    attackId: idSchema,
    playerId: idSchema,
    source: cardSchema,
  }),
  z.strictObject({
    ...effectFrameSchema.omit({ kind: true, effect: true }).shape,
    kind: z.literal('capture-pairs'),
    guards: z.array(referenceSchema),
    chosenGuard: referenceSchema.nullable(),
    pairs: z.array(z.strictObject({ guard: referenceSchema, prisoner: referenceSchema })),
  }),
  z.strictObject({
    ...effectFrameSchema.omit({ kind: true, effect: true }).shape,
    kind: z.literal('attack-series'),
    filter: unitFilterSchema,
    unitsOnly: z.boolean(),
    evenIfExhausted: z.boolean(),
    used: z.array(referenceSchema),
  }),
  z.strictObject({
    kind: z.literal('random-bottom'),
    owner: idSchema,
    cards: z.array(referenceSchema).min(1).max(120),
  }),
  z.strictObject({
    kind: z.literal('random-discard'),
    playerId: idSchema,
    owner: idSchema,
    source: cardSchema,
    cards: z.array(referenceSchema).min(1).max(120),
  }),
  z.strictObject({ kind: z.literal('optional-trigger'), trigger: triggerSchema }),
  abilityPaymentSchema,
  unitTaxSchema,
  z.strictObject({
    kind: z.literal('allocate-benefit'),
    playerId: idSchema,
    source: cardSchema,
    effect: resolvedDistributeEffectSchema,
    bindings: z.record(idSchema, referenceSchema).optional(),
    groups: z.record(idSchema, z.array(referenceSchema)).optional(),
    values: z.record(idSchema, count).optional(),
    names: z.record(idSchema, z.string().min(1).max(512)).optional(),
  }),
  z.strictObject({
    kind: z.literal('zone-search'),
    playerId: idSchema,
    source: cardSchema,
    owner: idSchema,
    cards: z.array(referenceSchema).max(240),
    effect: zoneSearchEffectSchema,
    bindings: z.record(idSchema, referenceSchema).optional(),
    groups: z.record(idSchema, z.array(referenceSchema)).optional(),
    values: z.record(idSchema, count).optional(),
    names: z.record(idSchema, z.string().min(1).max(512)).optional(),
  }),
  z.strictObject({
    kind: z.literal('credit-payment'),
    playerId: idSchema,
    amount: count,
    intent: intentSchema,
    selections: z.array(idSchema),
    continuation: z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('action'), extraActions: count.optional() }),
      effectFrameSchema,
      unitTaxSchema,
      abilityPaymentSchema,
      exploitPlaySchema,
    ]),
  }),
  z.strictObject({
    kind: z.literal('zone-inspection'),
    playerId: idSchema,
    source: cardSchema,
    owner: idSchema,
    chooser: idSchema,
    cards: z.array(referenceSchema).max(120),
    effect: resolvedInspectionEffectSchema,
    bindings: z.record(idSchema, referenceSchema).optional(),
    groups: z.record(idSchema, z.array(referenceSchema)).optional(),
    values: z.record(idSchema, count).optional(),
    names: z.record(idSchema, z.string().min(1).max(512)).optional(),
  }),
  z.strictObject({
    kind: z.literal('allocate-damage'),
    after: afterDamageSchema.optional(),
    upTo: z.boolean().optional(),
    playerId: idSchema,
    source: cardSchema,
    amount: count,
    filter: unitFilterSchema,
    optional: z.boolean(),
    bindings: z.record(idSchema, referenceSchema).optional(),
  }),
  z.strictObject({
    kind: z.literal('allocate-indirect'),
    after: afterDamageSchema.optional(),
    playerId: idSchema,
    source: cardSchema,
    recipient: idSchema,
    assigner: idSchema,
    amount: count,
  }),
  z.strictObject({
    kind: z.literal('finish-searched-play'),
    playerId: idSchema,
    target: referenceSchema,
  }),
  z.strictObject({
    kind: z.literal('disclose'),
    playerId: idSchema,
    source: cardSchema,
    chooser: idSchema,
    effect: discloseEffectSchema,
    bindings: z.record(idSchema, referenceSchema).optional(),
    groups: z.record(idSchema, z.array(referenceSchema)).optional(),
    values: z.record(idSchema, count).optional(),
    names: z.record(idSchema, z.string().min(1).max(512)).optional(),
  }),
  z.strictObject({
    kind: z.literal('plot-reveal'),
    playerId: idSchema,
    source: cardSchema,
    cards: z.array(referenceSchema).min(1).max(120),
  }),
  z.strictObject({
    kind: z.literal('arrange-deck'),
    minDiscard: count.max(1).optional(),
    owner: idSchema,
    playerId: idSchema,
    source: cardSchema,
    mode: z.enum(['discard-one', 'bottom-any', 'hand-bottom']),
    stage: z.enum(['choose-discard', 'choose-bottom', 'order-top', 'order-bottom']),
    cards: z.array(referenceSchema).max(120),
    bottom: z.array(idSchema).max(120),
    topOrder: z.array(idSchema).max(120),
    bottomOrder: z.array(idSchema).max(120),
  }),
  z.strictObject({ kind: z.literal('search'), ...searchFields }),
  z.strictObject({
    kind: z.literal('search-shuffle'),
    ...searchFields,
    selected: z.array(idSchema).max(120),
  }),
  z.strictObject({ kind: z.literal('first-player') }),
  z.strictObject({ kind: z.literal('shuffle'), playerId: idSchema }),
  z.strictObject({ kind: z.literal('draw'), players: z.array(idSchema), count }),
  z.strictObject({ kind: z.literal('mulligan'), playerId: idSchema }),
  z.strictObject({
    kind: z.literal('resource'),
    playerId: idSchema,
    setup: z.boolean(),
    queuedResources: z
      .array(z.strictObject({ instanceId: idSchema, incarnation: count }))
      .max(2)
      .optional(),
  }),
  z.strictObject({ kind: z.literal('begin-action') }),
  z.strictObject({ kind: z.literal('regroup-delayed') }),
  z.strictObject({ kind: z.literal('begin-regroup') }),
  z.strictObject({ kind: z.literal('expire-phase') }),
  z.strictObject({ kind: z.literal('expire-round') }),
  z.strictObject({ kind: z.literal('finish-regroup'), extraRemaining: count.optional() }),
  z.strictObject({
    kind: z.literal('delayed-batch'),
    effects: z.array(delayedSchema).min(1),
    playerId: idSchema.nullable(),
  }),
  actionFrameSchema,
  z.strictObject({ kind: z.literal('ready') }),
  z.strictObject({ kind: z.literal('flush-triggers') }),
  z.strictObject({ kind: z.literal('queue-triggers'), triggers: z.array(triggerSchema).min(1) }),
  z.strictObject({
    kind: z.literal('trigger-batch'),
    chooseOne: z.boolean().optional(),
    chooseAny: z.boolean().optional(),
    triggers: z.array(triggerSchema).min(1),
    playerId: idSchema.nullable(),
  }),
  effectFrameSchema,
  z.strictObject({
    kind: z.literal('unique'),
    playerId: idSchema,
    cards: z.array(idSchema).min(2),
  }),
  z.strictObject({
    kind: z.enum(['combat', 'combat-response']),
    attackId: idSchema,
  }),
  z.strictObject({
    kind: z.literal('damage'),
    tokens: tokenCreationSchema.optional(),
    after: afterDamageSchema.optional(),
    combatAttackId: idSchema.optional(),
    actor: idSchema.nullable(),
    assignments: z.array(damageAssignmentSchema).min(1),
  }),
  z.strictObject({ kind: z.literal('end-attack'), attackId: idSchema }),
  z.strictObject({
    kind: z.literal('finish-action'),
    playerId: idSchema,
    passed: z.boolean(),
    extraActions: count.optional(),
  }),
]);
export type Frame = z.infer<typeof frameSchema>;

export const factSchema = z.strictObject({
  mode: z.string().min(1).max(128).optional(),
  seq: count,
  type: z.enum([
    'initiative',
    'captured',
    'rescued',
    'shuffled',
    'drawn',
    'searched',
    'delayed-scheduled',
    'delayed-resolved',
    'looked-at',
    'revealed',
    'shown',
    'mulligan',
    'resourced',
    'played',
    'attacked',
    'attack-ended',
    'damage',
    'defeated',
    'deployed',
    'leader-flipped',
    'token-creation-replaced',
    'unit-defeat-replaced',
    'upgrade-defeat-replaced',
    'converted-to-unit',
    'converted-to-upgrade',
    'ability-used',
    'bounty-collected',
    'play-cancelled',
    'passed',
    'round',
    'readied',
    'ended',
    'triggered',
    'healed',
    'resource-returned',
    'attached',
    'damage-prevented',
    'modified',
    'exhausted',
    'returned-to-hand',
    'left-play',
    'moved-arena',
    'control-changed',
    'discarded',
    'put-on-deck',
    'mode-chosen',
    'card-named',
    'number-chosen',
    'created',
    'force-used',
  ]),
  audience: z.union([z.literal('public'), z.array(idSchema)]),
  namedCard: z.string().min(1).max(512).optional(),
  actor: idSchema.nullable(),
  cards: z.array(referenceSchema),
  amount: count.nullable(),
});
export type Fact = z.infer<typeof factSchema>;
export type FactType = Fact['type'];
export const stateSchema = z.strictObject({
  versions: z
    .strictObject({
      state: z.literal(versions.state),
      engine: z.string().min(1).max(100),
      cards: z.string().min(1).max(100),
      rules: z.literal(versions.rules),
      format: z.literal(versions.format),
    })
    .refine(compatibleVersions, 'Incompatible Crossfire versions'),
  gameId: idSchema,
  revision: count,
  nextId: count,
  players: z.record(idSchema, playerSchema),
  seats: z.tuple([idSchema, idSchema]),
  cards: z.record(idSchema, cardSchema),
  attacks: z.array(attackSchema),
  delayedEffects: z.array(delayedSchema),
  printedStatActivations: z.array(
    z.strictObject({ key: z.string().min(1).max(512), order: count }),
  ),
  keywordGrants: z.array(
    z.strictObject({
      id: idSchema,
      source: cardSchema,
      playerId: idSchema,
      trait: idSchema,
      abilities: simpleAbilitiesSchema,
    }),
  ),
  lastingEffects: z.array(lastingSchema),
  namedEffects: z.array(
    z.strictObject({
      appliesTo: z.enum(['enemy', 'each']),
      expires: z.discriminatedUnion('kind', [
        z.strictObject({ kind: z.literal('source-in-play') }),
        z.strictObject({
          kind: z.literal('phase'),
          round: z.number().int().min(1),
          phase: z.enum(['setup', 'action', 'regroup', 'ended']),
        }),
      ]),
      id: idSchema,
      source: referenceSchema,
      playerId: idSchema,
      name: z.string().min(1).max(512),
      restriction: z.enum(['prevent-play', 'lose-abilities']),
    }),
  ),
  traitLosses: z
    .array(
      z.strictObject({
        source: referenceSchema,
        playerId: idSchema,
        trait: z.string().min(1),
        round: count,
        phase: z.enum(['action', 'regroup']),
      }),
    )
    .optional(),
  playRestrictions: z.array(
    z.strictObject({
      id: idSchema,
      source: cardSchema,
      playerId: idSchema,
      filter: cardFilterSchema,
      round: count,
      phase: z.enum(['action', 'regroup']),
    }),
  ),
  actionHistory: z
    .strictObject({ attacks: z.array(referenceSchema), basesAttacked: z.array(idSchema) })
    .nullable(),
  phaseHistory: z.strictObject({
    damageAttempts: z.array(referenceSchema),
    damagedUnits: z.array(referenceSchema),
    basesDamaged: z.array(idSchema),
    basesAttacked: z.array(idSchema),
    baseAttackers: z.array(referenceSchema).optional(),
    upgradesDefeated: z.array(idSchema),
    cardsDrawn: z.record(idSchema, count),
    discarded: z.array(
      z.strictObject({ card: referenceSchema, owner: idSchema, from: z.enum(['hand', 'deck']) }),
    ),
    enemyBaseDamage: z.record(idSchema, count),
    unitEntries: z.array(
      cardSchema.extend({ traits: z.array(z.string().min(1)), leaderUnit: z.boolean() }),
    ),
    left: z.array(
      cardSchema.extend({ traits: z.array(z.string().min(1)), leaderUnit: z.boolean() }),
    ),
    actionsTaken: z.record(idSchema, count),
    enemyBaseDamaged: z.array(idSchema),
    indirectDamage: z.array(idSchema),
    tokensCreated: z.array(idSchema),
    tokenUpgradesGiven: z.array(idSchema).optional(),
    ownCardsDiscarded: z.array(idSchema),
    played: z.array(
      z.strictObject({
        playerId: idSchema,
        card: cardSchema,
        traits: z.array(z.string().min(1)),
        host: cardSchema.optional(),
      }),
    ),
    lastActions: z.record(idSchema, z.strictObject({ basesAttacked: z.array(idSchema) })),
    defeatedAttacking: z.array(cardSchema),
    baseDamageSources: z.array(referenceSchema),
    defeated: z.array(
      cardSchema.extend({ traits: z.array(z.string().min(1)), leaderUnit: z.boolean() }),
    ),
    attacks: z.array(
      cardSchema.extend({ traits: z.array(z.string().min(1)), leaderUnit: z.boolean() }),
    ),
    forceUsed: z.record(idSchema, count),
    entered: z.array(referenceSchema),
  }),
  defeatedAbilityBatches: z.array(
    z.strictObject({ unit: cardSchema, triggers: z.array(triggerSchema) }),
  ),
  usedDefeatedAbilities: z.array(triggerSchema),
  usedPlayedAbilities: z.array(triggerSchema),
  phaseTriggers: z.array(
    z.strictObject({
      round: count.positive(),
      phase: z.enum(['action', 'regroup']),
      timing: z.enum(['initiative-taken', 'played-ability-used']),
      trigger: triggerSchema,
    }),
  ),
  usedAttackAbilities: z.array(triggerSchema),
  usedBounties: z.array(triggerSchema),
  departedUpgrades: z.array(
    z.strictObject({
      reference: referenceSchema,
      controller: idSchema,
      traits: z.array(z.string().min(1)),
      arena: z.enum(['ground', 'space', 'base']),
      abilities: z.array(abilityOriginSchema).min(1),
    }),
  ),
  departedUnits: z.array(departedUnitSchema),
  captured: z.array(idSchema),
  setAside: z.array(idSchema),
  searching: z.array(idSchema),
  roundHistory: z.strictObject({
    actionUses: z.array(
      z.strictObject({
        source: referenceSchema,
        origin: referenceSchema,
        abilityId: idSchema,
        phase: z.enum(['action', 'regroup']).optional(),
      }),
    ),
    triggerUses: z.array(z.string().min(1)),
    plays: z.array(
      z.strictObject({
        card: cardSchema,
        asUnit: z.boolean(),
        whenDefeated: z.boolean(),
        host: cardSchema.optional(),
      }),
    ),
  }),
  phaseStatModifiers: z.array(
    z.strictObject({
      source: cardSchema,
      playerId: idSchema,
      filter: unitFilterSchema,
      power: z.number().int(),
      hp: z.number().int(),
      round: count,
      phase: z.enum(['action', 'regroup']),
    }),
  ),
  grantedPlays: z.array(
    z.strictObject({
      scope: z.enum(['source', 'bound-card']),
      recipient: z.enum(['self', 'enemy']),
      free: z.boolean(),
      discount: count.optional(),
      phaseAbilities: simpleAbilitiesSchema.optional(),
      ignoreAspectPenalties: z.boolean(),
      source: cardSchema,
      target: referenceSchema,
      playerId: idSchema,
      round: count,
      phase: z.enum(['action', 'regroup']),
    }),
  ),
  playPayment: playPaymentSchema.nullable(),
  playModifiers: z.array(
    z.strictObject({
      optionalFreeCopy: cardIdSchema.optional(),
      phaseCost: z
        .strictObject({ increase: count, recipient: z.enum(['self', 'enemy']) })
        .optional(),
      bounty: count.optional(),
      discountIfSharesKeyword: z.boolean().optional(),
      using: z.enum(['plot', 'smuggle']).optional(),
      phaseAbilities: simpleAbilitiesSchema.optional(),
      id: idSchema,
      source: cardSchema,
      playerId: idSchema,
      filter: cardFilterSchema,
      discount: count,
      ready: z.boolean(),
      round: count,
      phase: z.enum(['action', 'regroup']),
    }),
  ),
  ground: z.array(idSchema),
  space: z.array(idSchema),
  phase: z.enum(['setup', 'action', 'regroup', 'ended']),
  round: count,
  activePlayer: idSchema,
  initiative: z.strictObject({ holder: idSchema, claimed: z.boolean() }),
  consecutivePasses: count.max(2),
  lastPassPlayer: idSchema.nullable(),
  execution: z.strictObject({
    frames: z.array(frameSchema),
    pendingTriggers: z.array(triggerSchema),
    decision: decisionSchema.nullable(),
    random: z
      .strictObject({ id: idSchema, bounds: z.array(z.number().int().positive()) })
      .nullable(),
  }),
  disclosure: z.strictObject({ handsToPlayers: z.boolean(), handsToSpectators: z.boolean() }),
  result: z
    .strictObject({
      winner: idSchema.nullable(),
      reason: z.enum(['base-defeat', 'concession', 'card-effect']),
    })
    .nullable(),
  facts: z.array(factSchema),
});
export type GameState = z.infer<typeof stateSchema>;

const envelope = { gameId: idSchema, expectedRevision: count };
export const inputSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...envelope,
    type: z.literal('decision'),
    playerId: idSchema,
    decisionId: idSchema,
    optionId: idSchema,
    selections: z.array(idSchema).max(512).default([]),
    namedCardId: cardIdSchema.optional(),
    chosenNumber: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  }),
  z.strictObject({
    ...envelope,
    type: z.literal('random'),
    requestId: idSchema,
    values: z.array(count).max(120),
  }),
  z.strictObject({ ...envelope, type: z.literal('concede'), playerId: idSchema }),
]);
export type EngineInput = z.infer<typeof inputSchema>;

export class IllegalInput extends Error {
  constructor() {
    super('Illegal Crossfire input');
    this.name = 'IllegalInput';
  }
}
