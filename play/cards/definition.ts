export type Aspect = 'Vigilance' | 'Command' | 'Aggression' | 'Cunning' | 'Heroism' | 'Villainy';
export type Arena = 'ground' | 'space';
export type CardFilter = {
  otherThan?: string;
  sharesTraitWith?: string;
  sharesFriendlyUnitAspect?: boolean;
  sharesFriendlyUnitTrait?: boolean;
  withoutTrait?: string;
  notName?: string;
  costAtMost?: NumericValue;
  owner?: 'self' | 'enemy';
  hasKeyword?: Keyword;
  printedKeyword?: Keyword;
  differentNameFrom?: readonly string[];
  costLessThan?: NumericValue;
  withoutAspect?: Aspect;
  name?: string;
  inGroup?: string;
  playAs?: 'upgrade' | 'non-unit' | 'pilot';
  costParity?: 'odd' | 'even';
  anyAspect?: readonly Aspect[];
  notKind?: 'unit' | 'upgrade' | 'event';
  arena?: Arena;
  attachesTo?: string;
  sameNameAs?: string;
  named?: string;
  whenDefeated?: boolean;
  defeatedThisPhase?: boolean;
  maxPower?: number;
  kind?: 'unit' | 'upgrade' | 'event';
  aspect?: Aspect;
  trait?: string;
  anyTrait?: readonly string[];
  unique?: boolean;
  maxCost?: number;
  minCost?: number;
  sharesAspectWith?: string;
};
export type InPlayFilter = {
  unique?: boolean;
  costParity?: 'odd' | 'even';
  controller: 'friendly' | 'enemy';
  trait?: string;
  otherThan?: string;
  roles: readonly ('unit' | 'upgrade' | 'leader')[];
};
export type UnitFilter = {
  sharesTraitWithGroup?: string;
  powerEquals?: NumericValue;
  remainingHpEquals?: NumericValue;
  mostCostAmong?: UnitFilter;
  damagedThisPhase?: boolean;
  condition?: Condition;
  hasBounty?: boolean;
  sameNameAs?: string;
  owner?: 'self' | 'enemy';
  costEquals?: NumericValue;
  minCost?: number;
  defendingAgainst?: UnitFilter;
  attackingAgainst?: UnitFilter;
  attacking?: 'any' | 'unit' | 'base';
  costLessThan?: NumericValue;
  upgradeTrait?: string;
  mostPowerAmong?: UnitFilter;
  differentArenaFrom?: string;
  playedThisPhase?: boolean;
  damageAtLeast?: number;
  whenDefeated?: boolean;
  inGroup?: string;
  notInGroup?: string;
  minKeywords?: number;
  sharesNoAspectWithGroup?: string;
  otherThanAny?: readonly string[];
  anyOf?: readonly UnitFilter[];
  attackingUnit?: string;
  enteredThisPhase?: boolean;
  sharesFriendlyLeaderTrait?: boolean;
  withUpgrade?: string;
  withTokenUpgrade?: boolean;
  sameAs?: string;
  defending?: boolean;
  attackedThisPhase?: boolean;
  attackedBaseThisPhase?: boolean;
  withoutUpgrade?: string;
  remainingHpLessThanPower?: string;
  remainingHpLessThan?: string;
  withoutPilot?: boolean;
  dealtBaseDamage?: boolean;
  leader?: boolean;
  excludeName?: string;
  hasKeyword?: Keyword | 'Raid' | 'Restore';
  powerAtLeast?: number;
  costGreaterThan?: string;
  anyAspect?: readonly Aspect[];
  name?: string;
  powerAtMost?: number;
  powerAtMostUnit?: string;
  arena?: Arena;
  controller?: 'friendly' | 'enemy';
  nonLeader?: boolean;
  trait?: string;
  maxCost?: NumericValue;
  remainingHpAtLeast?: number;
  remainingHpAtMost?: number;
  damaged?: boolean;
  upgraded?: boolean;
  unique?: boolean;
  token?: boolean;
  anyTrait?: readonly string[];
  withoutTrait?: string;
  exhausted?: boolean;
  otherThan?: string;
  powerLessThan?: string;
  sameArenaAs?: string;
};

export type ConversionFilter = Pick<
  UnitFilter,
  'controller' | 'trait' | 'anyTrait' | 'name' | 'withoutPilot'
>;
export type UpgradeFilter = {
  sameAs?: string;
  withoutTrait?: string;
  cardId?: string;
  maxCost?: number;
  token?: boolean;
  controller?: 'friendly' | 'enemy';
  attachedTo?: string;
  otherThan?: string;
  nonLeader?: boolean;
  unique?: boolean;
};
export type NumericValue =
  | { kind: 'ready-resources'; player: 'self' | 'enemy' }
  | { kind: 'spending-power'; player: 'self' | 'enemy' }
  | { kind: 'guarded-cards'; target: string }
  | {
      kind: 'unit-history-count';
      player: 'self' | 'enemy';
      event: 'defeated' | 'defeated-attacking';
    }
  | { kind: 'difference'; left: NumericValue; right: NumericValue }
  | { kind: 'unit-sum'; filter: UnitFilter; stat: 'damage' | 'upgrades'; multiplier?: number }
  | { kind: 'keyword-count'; target: string }
  | { kind: 'floor-divide'; value: NumericValue; divisor: number }
  | {
      kind: 'phase-count';
      event: 'cards-drawn' | 'enemy-base-damage' | 'hand-cards-discarded';
      player: 'self' | 'enemy';
    }
  | { kind: 'group-size'; group: string }
  | { kind: 'group-stat-sum'; group: string; stat: 'power' | 'cost' }
  | { kind: 'product'; left: NumericValue; right: NumericValue }
  | { kind: 'conditional'; condition: Condition; then: NumericValue; otherwise: NumericValue }
  | {
      kind: 'zone-size';
      filter?: CardFilter;
      distinctBy?: 'cost' | 'name';
      zone: 'hand' | 'deck' | 'discard' | 'resources';
      player: 'self' | 'enemy';
      multiplier?: number;
    }
  | { kind: 'printed-stat'; target: string; stat: 'power' | 'hp' }
  | { kind: 'cards-in-play-count'; filter: InPlayFilter }
  | { kind: 'credits-count'; player: 'self' | 'enemy' }
  | { kind: 'unit-aspect-icons'; aspect: Aspect; filter: UnitFilter }
  | { kind: 'force-uses-this-phase' }
  | { kind: 'cost-difference'; group: string }
  | { kind: 'on-attack-count'; target: string }
  | { kind: 'distinct-aspects'; target: string }
  | { kind: 'unit-aspects'; filter: UnitFilter }
  | { kind: 'base-damage-increase'; since: string; divisor: number }
  | { kind: 'upgrades-count'; target: string; trait?: string; cardId?: string; notCardId?: string }
  | { kind: 'base-upgrades-count'; player: 'self' | 'enemy' }
  | { kind: 'card-cost'; target: string }
  | number
  | { kind: 'value'; name: string; multiplier?: number }
  | { kind: 'unit-count'; filter: UnitFilter; distinctNames?: boolean }
  | { kind: 'own-base-damage'; divisor: number }
  | { kind: 'unit-stat'; target: string; stat: 'power' | 'remaining-hp' | 'damage' };
export type Keyword = NonNullable<Abilities['keywords']>[number];
export type AuraDefinition = {
  id: string;
  filter: UnitFilter;
  abilities?: Pick<Abilities, 'keywords' | 'raid' | 'restore' | 'triggers'>;
  power?: NumericValue;
  hp?: NumericValue;
  losesKeywords?: readonly Keyword[];
  keywordsFromSource?: boolean;
};
export type ConstantAbility = {
  raid?: NumericValue;
  restore?: NumericValue;
  condition: Condition;
  abilities?: SimpleAbilities;
  losesKeywords?: readonly Keyword[];
  power?: NumericValue;
  hp?: NumericValue;
};
export type SimpleAbilities = Pick<
  Abilities,
  | 'keywords'
  | 'bounties'
  | 'smuggle'
  | 'piloting'
  | 'exploit'
  | 'raid'
  | 'restore'
  | 'firstCombatDamage'
  | 'defenderCombatFirst'
  | 'surviveZeroHp'
  | 'enemyAbilityImmunity'
  | 'cannotReady'
  | 'friendlyUnitsEnterReady'
> & {
  triggers?: readonly (Pick<
    TriggerDefinition,
    'id' | 'effects' | 'optional' | 'condition' | 'limit'
  > & {
    timing: 'attack' | 'attacked' | 'played';
  })[];
};
export type Condition =
  | { kind: 'initiative-unclaimed' }
  | { kind: 'leader-or-base-aspect'; aspect: Aspect }
  | { kind: 'enemy-last-action-attacked-base' }
  | { kind: 'discarded-this-phase' | 'no-resources-paid'; target: string }
  | { kind: 'numeric-greater' | 'numeric-equal'; left: NumericValue; right: NumericValue }
  | { kind: 'numeric-at-least'; value: NumericValue; amount: number }
  | { kind: 'unit-attacked-this-action'; target: string }
  | { kind: 'card-role'; target: string; role: 'upgrade' }
  | { kind: 'card-ready'; target: string }
  | { kind: 'unit-count-comparison'; relation: 'equal' | 'more' | 'less' }
  | {
      kind: 'played-card-this-phase';
      filter: Pick<CardFilter, 'kind' | 'notKind' | 'aspect' | 'withoutAspect' | 'trait'>;
      otherThan?: string;
    }
  | {
      kind: 'unit-history-at-least';
      event: 'attacked' | 'defeated' | 'entered' | 'left';
      leader?: boolean;
      aspect?: Aspect;
      token?: boolean;
      player: 'self' | 'enemy' | 'any';
      amount: number;
      trait?: string;
      otherThan?: string;
    }
  | { kind: 'round'; number: number }
  | { kind: 'different-costs'; targets: readonly [string, string] }
  | {
      kind: 'phase-event';
      event:
        | 'enemy-base-damaged'
        | 'indirect-damage'
        | 'token-created'
        | 'token-upgrade-given'
        | 'own-card-discarded'
        | 'enemy-base-was-damaged'
        | 'friendly-upgrade-defeated'
        | 'own-base-attacked';
    }
  | { kind: 'played-trait-this-phase'; traits: readonly string[] }
  | { kind: 'cards-played-this-phase-at-least'; player: 'self' | 'enemy'; amount: number }
  | { kind: 'cards-in-play-at-least'; filter: InPlayFilter; amount: number }
  | { kind: 'attacking-unit'; filter: UnitFilter }
  | { kind: 'unit-had-trait'; target: string; trait: string }
  | { kind: 'own-base-more-damaged' }
  | { kind: 'ambush-attack' }
  | { kind: 'attached-to-friendly-trait'; trait: string }
  | { kind: 'phase'; phase: 'action' | 'regroup' }
  | { kind: 'controls-leader-trait'; trait: string }
  | {
      kind: 'controls-base-trait';
      trait: string;
      player?: 'self' | 'enemy' | 'any';
    }
  | { kind: 'base-damage-at-least'; amount: number; player?: 'self' | 'enemy' | 'any' }
  | { kind: 'own-base-upgraded' }
  | { kind: 'more-cards-than-opponent'; player?: 'self' | 'enemy' }
  | { kind: 'attacked-with-trait'; trait: string; nonToken?: boolean }
  | { kind: 'resource-available'; player: 'self' | 'enemy'; exhausted: boolean }
  | { kind: 'value-at-least'; name: string; amount: number }
  | { kind: 'always' }
  | { kind: 'card-matches'; target: string; filter: CardFilter }
  | { kind: 'fewer-resources-than-opponent' }
  | { kind: 'force-with-you' }
  | { kind: 'all' | 'any'; conditions: readonly Condition[] }
  | { kind: 'not'; condition: Condition }
  | { kind: 'no-other-unit-attacked'; target: string }
  | { kind: 'controls-name'; name: string }
  | { kind: 'more-units-than-opponent'; arena?: Arena }
  | { kind: 'friendly-unit-defeated' }
  | { kind: 'unit-defeated'; target: string }
  | { kind: 'attacking-damaged-unit' }
  | { kind: 'discard-aspect'; aspect: Aspect }
  | { kind: 'units-at-least'; filter: UnitFilter; amount: number }
  | { kind: 'units-at-most'; filter: UnitFilter; amount: number }
  | { kind: 'opponent-has-more-units'; arena: Arena }
  | { kind: 'initiative' }
  | { kind: 'unit-matches'; target: string; filter: UnitFilter };
export type UnitOperation =
  | {
      kind: 'take-control';
      player: 'self' | 'enemy' | 'owner';
      returnWhen?: 'regroup' | 'source-leaves';
    }
  | { kind: 'move-arena'; arena: Arena }
  | { kind: 'damage'; amount: NumericValue; source?: string; unpreventable?: boolean }
  | { kind: 'exhaust' | 'ready' | 'return-to-hand' | 'defeat' | 'defeat-shields' }
  | {
      kind: 'give-token';
      token: 'shield' | 'experience' | 'advantage' | 'weakness';
      count: NumericValue;
    }
  | { kind: 'heal'; amount: number | 'all'; countAs?: string }
  | {
      kind: 'modify';
      printedPower?: number;
      printedHp?: number;
      power: NumericValue;
      hp: NumericValue;
      abilities?: SimpleAbilities;
      loseAbilities?: boolean;
      loseKeywords?: boolean;
      lostKeywords?: readonly Keyword[];
      loseTraits?: readonly string[];
      cannotReady?: boolean;
      cannotAttackBases?: boolean;
      cannotBeAttacked?: boolean;
      cannotDealCombatDamage?: boolean;
      cannotHeal?: boolean;
      surviveZeroHp?: boolean;
      preventNextDamage?: number | 'all';
      preventAllDamage?: boolean;
      skipRegroupReady?: boolean;
      duration: 'phase' | 'round' | 'attack' | 'source-in-play' | 'next-regroup';
    };

// The initial effect vocabulary is deliberately small. New mechanics add typed
// execution frames and conformance cases, never callbacks captured in live state.
export type CardEffect =
  | {
      kind: 'schedule-phase-trigger';
      id: string;
      timing: 'initiative-taken' | 'played-ability-used';
      optional?: boolean;
      effects: readonly CardEffect[];
    }
  | { kind: 'repeat-played-ability'; index: string }
  | { kind: 'exhaust-units'; filter: UnitFilter }
  | { kind: 'use-played-abilities'; filter: UnitFilter }
  | { kind: 'friendly-units-damage-different-enemies'; amount: number }
  | { kind: 'exchange-control'; first: string; second: string; effects: readonly CardEffect[] }
  | { kind: 'defeat-credits'; countAs: string; effects: readonly CardEffect[] }
  | { kind: 'after-attack'; effects: readonly CardEffect[] }
  | { kind: 'resource-departed'; target: string }
  | { kind: 'schedule-regroup-operation'; target: string; operation: 'bottom' | 'defeat' }
  | { kind: 'prevent-base-healing' }
  | { kind: 'lose-enemy-trait'; trait: string }
  | { kind: 'grant-keyword-until-source-leaves'; trait: string; abilities: SimpleAbilities }
  | { kind: 'prevent-next-base-damage'; target: string }
  | { kind: 'heal-target'; target: string; amount: NumericValue }
  | {
      kind: 'exhaust-bound';
      targets: readonly string[];
      countAs: string;
      effects: readonly CardEffect[];
    }
  | { kind: 'defeat-resource'; target: string }
  | {
      kind: 'token-and-damage';
      target: string;
      token: 'experience';
      count: NumericValue;
      damage: NumericValue;
    }
  | { kind: 'repeat-bounty'; index: string }
  | { kind: 'repeat-attack-ability'; index: string }
  | {
      kind: 'select-departed-upgrade';
      target: string;
      bind: string;
      optional: boolean;
      effects: readonly CardEffect[];
    }
  | { kind: 'reveal-card'; target: string; from?: 'hand'; effects?: readonly CardEffect[] }
  | {
      kind: 'random-card';
      units?: UnitFilter;
      targets?: readonly string[];
      group?: string;
      bind: string;
      effects: readonly CardEffect[];
    }
  | { kind: 'defeat-tokens'; countAs: string; effects: readonly CardEffect[] }
  | {
      kind: 'resource-cards';
      group: string;
      ready: boolean;
      countAs: string;
      effects: readonly CardEffect[];
    }
  | { kind: 'schedule-resource-repayment'; amount: NumericValue; at: 'regroup' | 'next-action' }
  | { kind: 'repeat-defeated-batch'; index: string }
  | { kind: 'repeat-defeated-ability'; index: string }
  | { kind: 'use-defeated-ability'; target: string }
  | { kind: 'schedule-regroup-victory'; arena: Arena }
  | { kind: 'extra-action' }
  | { kind: 'repeat-effects'; count: NumericValue; effects: readonly CardEffect[] }
  | { kind: 'bottom-hand'; group: string }
  | {
      kind: 'reveal-deck-cards';
      player: 'self' | 'enemy';
      count: number;
      group: string;
      effects: readonly CardEffect[];
    }
  | {
      kind: 'bottom-deck-group';
      group: string;
      from?: 'discard';
      countAs?: string;
      effects?: readonly CardEffect[];
    }
  | { kind: 'reveal-top'; player: 'self' | 'enemy'; bind: string; effects: readonly CardEffect[] }
  | { kind: 'restrict-play'; filter: CardFilter; player: 'self' | 'enemy' }
  | {
      kind: 'reveal-hand';
      player: 'self' | 'enemy';
      count?: { filter: CardFilter; bind: string };
      effects: readonly CardEffect[];
    }
  | { kind: 'random-discard'; ownerOf: string }
  | { kind: 'discard-random-hand'; player: 'self' | 'enemy' }
  | {
      kind: 'move-cards';
      group: string;
      from: 'hand' | 'discard' | 'deck' | 'resources';
      to: 'hand' | 'discard';
      filter?: CardFilter;
      discardBy?: 'owner' | 'enemy';
    }
  | {
      kind: 'distribute';
      exact?: boolean;
      benefit: 'advantage' | 'experience' | 'weakness' | 'heal' | 'damage';
      quantum?: number;
      amount: NumericValue;
      filter: UnitFilter;
      bind: string;
      effects: readonly CardEffect[];
    }
  | { kind: 'schedule-return'; target: string }
  | {
      kind: 'grant-discard-play';
      target: string;
      player: 'self' | 'enemy';
      free?: boolean;
      discount?: number;
      phaseAbilities?: SimpleAbilities;
      ignoreAspectPenalties?: boolean;
    }
  | {
      kind: 'search-zones';
      zones: readonly ('deck' | 'hand')[];
      player: 'self' | 'enemy' | 'bound-controller';
      ownerOf?: string;
      filter: CardFilter;
      to: 'discard';
    }
  | { kind: 'name-card' | 'choose-number'; bind: string; effects: readonly CardEffect[] }
  | {
      kind: 'restrict-named-card';
      name: string;
      restriction: 'prevent-play' | 'lose-abilities';
      appliesTo?: 'enemy' | 'each';
      duration?: 'source-in-play' | 'phase';
    }
  | { kind: 'take-control-upgrade'; target: string; player?: 'attacker' }
  | {
      kind: 'attach-self';
      filter: ConversionFilter;
      optional: boolean;
      effects?: readonly CardEffect[];
    }
  | { kind: 'return-unit-with-upgrades'; target: string; upgrades: string; freeNextCopy: boolean }
  | { kind: 'return-bound'; targets: readonly string[] }
  | { kind: 'attach-pilot'; host: string; optional?: boolean }
  | { kind: 'detach-pilot' }
  | { kind: 'flip-leader' }
  | { kind: 'attach-leader' }
  | { kind: 'draw-card'; target: string }
  | { kind: 'reattach-upgrade'; target: string; filter?: UnitFilter; chooser?: 'controller' }
  | { kind: 'exhaust-leader'; effects: readonly CardEffect[] }
  | { kind: 'damage-chosen-bases'; amount: number }
  | { kind: 'create-credits'; amount: NumericValue; player?: 'self' | 'enemy' }
  | {
      kind: 'defeat-credit';
      controller: 'self' | 'enemy' | 'any';
      optional: boolean;
      effects: readonly CardEffect[];
    }
  | {
      kind: 'disclose';
      group?: string;
      otherwise?: readonly CardEffect[];
      aspects: readonly Aspect[];
      player?: 'self' | 'enemy' | 'defender';
      effects: readonly CardEffect[];
    }
  | { kind: 'phase-play-cost'; player: 'self' | 'enemy'; filter: CardFilter; increase: number }
  | { kind: 'plot-play' }
  | {
      kind: 'next-play';
      discountIfSharesKeyword?: boolean;
      using?: 'plot' | 'smuggle';
      filter: CardFilter;
      discount?: NumericValue;
      ready?: boolean;
      phaseAbilities?: SimpleAbilities;
    }
  | {
      kind: 'play-card';
      player?: 'self' | 'enemy' | 'owner';
      sharesKeywordWith?: string;
      beforePlayed?: readonly CardEffect[];
      otherwise?: readonly CardEffect[];
      using?: 'plot' | 'smuggle';
      bindHost?: string;
      ready?: boolean;
      repeat?: boolean;
      attachFilter?: UnitFilter;
      phaseAbilities?: SimpleAbilities;
      phaseAbilitiesWithCredit?: SimpleAbilities;
      phaseDamagePrevention?: number;
      requirePlay?: boolean;
      group?: string;
      attachTo?: string;
      ignoreOneColoredPenalty?: boolean;
      ignoreAspectPenalties?: boolean | readonly Aspect[];
      from: 'hand' | 'discard' | 'deck' | 'resources';
      replaceResource?: boolean;
      takeControl?: boolean;
      target?: string;
      filter: CardFilter;
      discount?: NumericValue;
      free?: boolean;
      optional: boolean;
      bind?: string;
      effects?: readonly CardEffect[];
    }
  | {
      kind: 'inspect-zone';
      onlyFromGroup?: string;
      top?: number;
      reveal?: boolean;
      group?: string;
      ownerOf?: string;
      otherwise?: readonly CardEffect[];
      zone: 'hand' | 'discard' | 'resources' | 'deck';
      player: 'self' | 'enemy' | 'bound-controller';
      chooser: 'self' | 'owner' | 'enemy';
      filter: CardFilter;
      min: NumericValue;
      max: NumericValue;
      bind: string;
      effects: readonly CardEffect[];
      after?: readonly CardEffect[];
    }
  | {
      kind: 'move-card';
      discardBy?: 'owner';
      fromPlayer?: 'self' | 'enemy';
      target: string;
      from: 'hand' | 'discard' | 'deck' | 'resources';
      to: 'hand' | 'discard' | 'deck-top' | 'deck-bottom';
      effects?: readonly CardEffect[];
    }
  | {
      kind: 'mill';
      afterEvenIfEmpty?: boolean;
      player: 'self' | 'enemy' | 'defender';
      group?: string;
      count: number;
      bind: string;
      effects: readonly CardEffect[];
    }
  | { kind: 'unit-to-deck'; target: string }
  | {
      kind: 'divide-damage';
      after?: readonly CardEffect[];
      source?: string;
      amount: NumericValue;
      filter: UnitFilter;
      optional: boolean;
      upTo?: boolean;
    }
  | {
      kind: 'select-upgrades';
      filter: UpgradeFilter;
      min: number | 'all';
      max: number | 'all';
      bind: string;
      effects: readonly CardEffect[];
    }
  | {
      kind: 'move-upgrades';
      group: string;
      to: 'discard' | 'hand';
      bindHost?: string;
      effects?: readonly CardEffect[];
    }
  | {
      kind: 'select-resources';
      chooser?: 'self' | 'owner';
      player: 'self' | 'enemy';
      exhausted: boolean | 'any';
      min: NumericValue;
      max: NumericValue | 'all';
      operation: 'ready' | 'exhaust' | 'defeat' | 'inspect';
      group?: string;
      countAs?: string;
      effects?: readonly CardEffect[];
    }
  | { kind: 'take-enemy-credit' }
  | { kind: 'gain-force' }
  | {
      kind: 'indirect-damage';
      amount: NumericValue;
      recipient: 'chosen' | 'enemy' | 'defender';
      after?: readonly CardEffect[];
    }
  | {
      kind: 'modify-units';
      filter: UnitFilter;
      operation: Extract<UnitOperation, { kind: 'modify' }>;
    }
  | { kind: 'phase-stat-modifier'; filter: UnitFilter; power: number; hp: number }
  | { kind: 'with-value'; name: string; value: NumericValue; effects: readonly CardEffect[] }
  | { kind: 'resource-top'; optional: boolean; ready?: boolean; player?: 'self' | 'enemy' }
  | {
      kind: 'select-target';
      units?: UnitFilter;
      bases?: 'any' | 'friendly' | 'enemy';
      baseRemainingHpAtMost?: number;
      otherThan?: string;
      chooser?: 'self' | 'enemy';
      chooserOf?: string;
      bind: string;
      optional: boolean;
      effects: readonly CardEffect[];
    }
  | {
      kind: 'damage-target';
      target: string;
      amount: NumericValue;
      excessToEnemyBase?: boolean;
      source?: string;
    }
  | {
      kind: 'create-unit';
      creatorOf?: string;
      player?: 'self' | 'enemy';
      group?: string;
      phaseAbilities?: SimpleAbilities;
      cardId: string;
      count: NumericValue;
      bind?: string;
      effects?: readonly CardEffect[];
    }
  | {
      kind: 'select-units';
      filter: UnitFilter;
      bind: string;
      remainingHpBudget?: number;
      budget?: { stat: 'power' | 'cost'; max: NumericValue };
      min?: NumericValue;
      max?: NumericValue;
      effects: readonly CardEffect[];
    }
  | { kind: 'defeat-group'; group: string; countAs: string; effects: readonly CardEffect[] }
  | { kind: 'defeat-bound'; targets: readonly string[] }
  | { kind: 'damage-bound'; targets: readonly string[]; amount: number }
  | {
      kind: 'pay';
      player?: 'self' | 'enemy';
      otherwise?: readonly CardEffect[];
      costs: readonly AbilityCost[];
      optional: boolean;
      effects: readonly CardEffect[];
    }
  | { kind: 'defeat-self-upgrade' }
  | { kind: 'defeat-target'; target: string }
  | {
      kind: 'choose-mode';
      private?: boolean;
      chooser?: 'self' | 'enemy';
      chooserOf?: string;
      repeat?: number;
      options: readonly { id: string; condition?: Condition; effects: readonly CardEffect[] }[];
    }
  | {
      kind: 'if';
      condition: Condition;
      effects: readonly CardEffect[];
      otherwise?: readonly CardEffect[];
    }
  | {
      kind: 'select-unit';
      leastRemainingHp?: boolean;
      forAttack?: { unitsOnly?: boolean; evenIfExhausted?: boolean };
      otherwise?: readonly CardEffect[];
      chooser?: 'self' | 'enemy';
      chooserOf?: string;
      allowMissing?: boolean;
      filter: UnitFilter;
      bind: string;
      optional: boolean;
      effects: readonly CardEffect[];
    }
  | { kind: 'exhaust-group'; group: string; countAs?: string; effects?: readonly CardEffect[] }
  | { kind: 'ready-units'; filter: UnitFilter }
  | { kind: 'units-damage-target'; target: string; filter: UnitFilter }
  | { kind: 'capture-pairs' }
  | { kind: 'attack-series'; filter: UnitFilter; unitsOnly: boolean; evenIfExhausted: boolean }
  | { kind: 'capture-group'; guard: string; group: string }
  | { kind: 'ready-leader'; optional: boolean }
  | {
      kind: 'capture-unit';
      guard: string;
      target: string;
      from?: 'discard';
      rescueAtRegroup?: boolean;
    }
  | {
      kind: 'look-deck';
      minDiscard?: number;
      player?: 'self' | 'enemy';
      count: number;
      mode: 'discard-one' | 'bottom-any';
    }
  | { kind: 'each-unit'; filter: UnitFilter; bind: string; effects: readonly CardEffect[] }
  | {
      kind: 'on-unit';
      creatorOf?: string;
      target: string;
      operation: UnitOperation;
      ifYouDo?: readonly CardEffect[];
    }
  | {
      kind: 'attack-bound';
      preventDamage?: boolean;
      defenderPowerModifier?: number;
      gainsAbilitiesOf?: string;
      blankDefender?: boolean;
      damageStat?: 'remaining-hp';
      swapRaidRestore?: boolean;
      cannotAttackBases?: boolean;
      evenIfExhausted?: boolean;
      after?: readonly CardEffect[];
      combatFirst?: Condition;
      unitsOnly?: boolean;
      target: string;
      optional: boolean;
      powerBonus?: NumericValue;
      abilities?: SimpleAbilities;
    }
  | { kind: 'damage-bases'; amount: number; targets: 'each' | 'enemy' }
  | {
      kind: 'damage-unit';
      amount: number | 'source-power' | 'hand-size' | 'remaining-hp-minus-one';
      filter?: UnitFilter;
      arena: Arena | 'any';
      optional: boolean;
      controller?: 'enemy';
    }
  | { kind: 'heal-base'; amount: number }
  | { kind: 'heal-unit'; amount: number; optional: boolean }
  | { kind: 'heal-units'; filter: UnitFilter; amount: number | 'all' }
  | { kind: 'self-resource'; ready?: boolean; optional?: boolean }
  | { kind: 'draw-cards'; amount: NumericValue; player?: 'self' | 'enemy' }
  | { kind: 'damage-base'; amount: number }
  | { kind: 'damage-own-base'; amount: NumericValue }
  | {
      kind: 'damage-units';
      after?: readonly CardEffect[];
      bind?: string;
      amount: NumericValue;
      filter: UnitFilter;
      max?: NumericValue;
      mandatory?: boolean;
      source?: string;
    }
  | { kind: 'defeat-unit'; filter: UnitFilter; optional: boolean; healOwnBase?: number }
  | { kind: 'defeat-units'; filter: UnitFilter; damageEnemyBase?: number }
  | { kind: 'defeat-defender-shields' }
  | { kind: 'ambush' }
  | { kind: 'support' }
  | { kind: 'heal-own-base'; amount: NumericValue; player?: 'self' | 'enemy' }
  | { kind: 'damage-defender'; amount: number; upgradedAmount: number }
  | { kind: 'play-unit'; discount: number; ready: boolean; defeatAtRegroup: boolean }
  | {
      kind: 'search-deck';
      afterEach?: readonly CardEffect[];
      cardFilter?: CardFilter;
      hasKeyword?: Keyword;
      name?: string;
      destination?: 'discard' | 'deck-top';
      afterEvenIfEmpty?: boolean;
      anyAspect?: readonly Aspect[];
      reveal?: boolean;
      player?: 'self' | 'enemy';
      bind?: string;
      after?: readonly CardEffect[];
      count: NumericValue;
      filter: 'unit' | 'upgrade' | 'event' | 'any';
      trait?: string;
      max: number;
      arena?: Arena;
      maxTotalCost?: number;
      attachesTo?: string;
      play?: { discount: number; free?: boolean; ready?: boolean; after?: readonly CardEffect[] };
    }
  | {
      kind: 'attack-with-unit';
      redirectExcess?: boolean;
      powerBonus: number | 'hand-size';
      filter?: UnitFilter;
      grantSourceTriggers?: boolean;
    }
  | { kind: 'schedule-next-action'; effects: readonly CardEffect[] }
  | { kind: 'schedule-regroup-effects'; effects: readonly CardEffect[] }
  | { kind: 'tax-units'; player: 'self' | 'enemy'; amount: number }
  | { kind: 'choose-self-token' }
  | { kind: 'copy-token'; upgrade: string; target: string }
  | { kind: 'give-self-token'; token: 'shield' | 'experience' | 'weakness' }
  | { kind: 'defeat-upgrade'; optional: boolean; attachedTo?: string; nonUnique?: boolean }
  | {
      kind: 'deploy';
      as: 'unit' | 'unit-or-upgrade';
      condition: { kind: 'resources-at-least'; amount: number; reducedBy?: NumericValue } | null;
    };
export type ChosenCardCost =
  | { kind: 'ready-enemy-unit' }
  | { kind: 'defeat-friendly-upgrade' }
  | { kind: 'exhaust-friendly-unit' }
  | { kind: 'discard-hand'; count: number; filter?: CardFilter }
  | { kind: 'defeat-resource' }
  | { kind: 'return-friendly-unit'; filter: UnitFilter }
  | { kind: 'defeat-friendly-credit' }
  | { kind: 'defeat-friendly-token' };
export type AbilityCost =
  | { kind: 'damage-own-base'; amount: number }
  | ChosenCardCost
  | { kind: 'discard-deck'; count: number }
  | { kind: 'resources'; amount: number }
  | { kind: 'defeat-self' }
  | { kind: 'exhaust-self' }
  | { kind: 'force' };
export type ActionDefinition = {
  requiresPlayable?: boolean;
  anyPlayer?: boolean;
  zone?: 'discard';
  condition?: Condition;
  id: string;
  costs: readonly (AbilityCost | { kind: 'defeat-friendly-unit' })[];
  limit:
    | 'once-per-game'
    | 'once-per-round'
    | 'once-per-phase'
    | { per: 'game'; max: number }
    | null;
  effects: readonly CardEffect[];
};
export type Abilities = {
  protectSingleFriendlyUpgrade?: boolean;
  protectBaseUpgradeBySelfDefeat?: boolean;
  lookAtDeckTop?: boolean;
  printedStats?: readonly {
    condition: Condition;
    filter: UnitFilter;
    power?: number;
    hp?: number;
  }[];
  traitGrants?: readonly (
    | { fromTrait: string; trait: string; outsidePlay: boolean }
    | { leader: true; trait: string }
  )[];
  friendlyRaidMultiplier?: number;
  keywordSharing?: { keywords: readonly Keyword[]; raid?: number; restore?: number };
  unitProtection?: readonly {
    filter: UnitFilter;
    operations: readonly ('exhaust' | 'return-to-hand')[];
  }[];
  cannotReady?: boolean;
  bounties?: readonly { id: string; effects: readonly CardEffect[] }[];
  piloting?: readonly { id: string; cost: number; aspects: readonly Aspect[] }[];
  smuggle?: readonly { id: string; cost: number; aspects: readonly Aspect[] }[];
  resourceSmuggle?: readonly number[];
  friendlyRescueReady?: boolean;
  friendlyUnitsEnterReady?: boolean;
  surviveZeroHp?: boolean;
  protectFromAttackUnlessSentinel?: readonly UnitFilter[];
  ignoreAspectPenalties?: readonly { filter: CardFilter; condition?: Condition }[];
  defeatToUnit?: boolean;
  defeatToUpgrade?: boolean;
  halveResourcePayments?: boolean;
  doubleTokensBySelfDefeat?: boolean;
  extraRegroups?: number;
  baseDamageLimit?: number;
  defenderCombatFirst?: boolean;
  creditPayment?: boolean;
  blankEnemyCredits?: boolean;
  blankFriendlyAdvantages?: boolean;
  searchMultiplier?: number;
  cannotAttack?: boolean;
  attackBothArenas?: boolean;
  cannotAttackBases?: boolean;
  ambushCanAttackBases?: boolean;
  preventBaseHealing?: boolean;
  firstCombatDamage?: boolean;
  providesAspects?: boolean;
  enemyAbilityImmunity?: readonly ('defeat' | 'return-to-hand' | 'exhaust')[];
  cannotChangeController?: boolean;
  damageReplacements?: readonly {
    id: string;
    target: 'self' | 'other-friendly' | 'friendly';
    friendlySourceTrait?: string;
    operation: 'prevent' | 'increase';
    amount: number | 'all';
    enemyAbilityOnly?: boolean;
    otherSourceOnly?: boolean;
    firstEachPhase?: boolean;
    targetRole?: 'unit' | 'base' | 'any';
    minimumAmount?: number;
    effects?: readonly CardEffect[];
    dealtByFriendlyAbility?: boolean;
    optional?: boolean;
  }[];
  resourcePaymentTraits?: readonly string[];
  preventSelfByTraitSacrifice?: boolean;
  preventFriendlyByShield?: boolean;
  unpreventableDamageTraits?: readonly string[];
  cannotAttackUndamaged?: boolean;
  playReductions?: readonly {
    id: string;
    filter: CardFilter;
    amount: number;
    condition?: Condition;
    ordinalAmounts?: readonly number[];
    firstEachRound?: boolean;
    firstEachPhase?: boolean;
    host?: UnitFilter;
  }[];

  auras?: readonly AuraDefinition[];
  extraPilotSlots?: number;
  indirectBonus?: number;
  assignsOpponentIndirect?: boolean;
  assignsOwnIndirect?: boolean;
  regroupReadyPower?: number;
  constant?: readonly ConstantAbility[];
  powerModifier?: number;
  hpModifier?: number;
  raid?: number;
  restore?: number;
  exploit?: number;
  keywords?: readonly (
    | 'Sentinel'
    | 'Shielded'
    | 'Support'
    | 'Grit'
    | 'Overwhelm'
    | 'Saboteur'
    | 'Ambush'
    | 'Hidden'
    | 'Plot'
    | 'Coordinate'
    | 'Fortify'
  )[];
  actions?: readonly ActionDefinition[];
  triggers?: readonly TriggerDefinition[];
};
export type TriggerDefinition = {
  optional?: boolean;
  condition?: Condition;
  excludeSelf?: boolean;
  limit?: 'once-per-round' | 'once-per-phase';
  id: string;
  timing:
    | 'drawn'
    | 'played-ability-used'
    | 'damaged'
    | 'discarded'
    | 'readied'
    | 'own-base-attacked'
    | 'friendly-combat-base-damage-dealt'
    | 'defeated-ability-used'
    | 'attack-ability-used'
    | 'bounty'
    | 'bounty-collected'
    | 'own-deck-card-discarded'
    | 'own-base-damaged'
    | 'base-damage-dealt'
    | 'combat-base-damage-dealt'
    | 'force-used'
    | 'enemy-cards-drawn'
    | 'healed'
    | 'upgrade-played-on-self'
    | 'cards-drawn'
    | 'friendly-attack-ended'
    | 'regroup-start'
    | 'action-start'
    | 'played'
    | 'deployed'
    | 'leader-deployed'
    | 'enemy-leader-deployed'
    | 'created'
    | 'attack'
    | 'attacked'
    | 'defeated'
    | 'enemy-defeated'
    | 'friendly-defeated'
    | 'indirect-unit-damaged'
    | 'initiative-taken'
    | 'friendly-attack'
    | 'enemy-card-played'
    | 'friendly-card-played'
    | 'friendly-damage-dealt'
    | 'unit-entered'
    | 'friendly-played'
    | 'friendly-created'
    | 'friendly-entered'
    | 'host-combat-ended'
    | 'attached'
    | 'host-readied'
    | 'detached'
    | 'host-attacked'
    | 'attacking-unit-damage-dealt'
    | 'attack-ended'
    | 'unit-left-play'
    | 'enemy-base-damage'
    | 'own-hand-revealed-or-discarded'
    | 'friendly-unit-damage'
    | 'friendly-damage-survived'
    | 'upgrades-attached'
    | 'pilot-attached'
    | 'friendly-upgrade-defeated'
    | 'non-combat-damage';
  effects: readonly CardEffect[];
};

type Identity = {
  cardId: string;
  name: string;
  aspects: readonly Aspect[];
  traits: readonly string[];
  unique?: true;
};
export type UnitDefinition = Identity &
  Abilities & {
    kind: 'unit';
    costReductions?: readonly { condition: Condition; amount: NumericValue }[];
    token?: true;
    cost: number;
    power: number;
    hp: number;
    arena: Arena;
    entersReady?: Condition;
    defeatReadyResourceDiscount?: number;
    damageFriendlyUnitDiscount?: number;
    bottomDiscardForPlayedAbilities?: { max: number; maxCost: number };
    piloting?: readonly { id: string; cost: number; aspects: readonly Aspect[] }[];
    upgrade?: UpgradeProfile;
  };
export type BaseDefinition = Identity &
  Abilities & {
    kind: 'base';
    hp: number;
    minimumDeckIncrease?: number;
    startingHandReduction?: number;
    startingHandIncrease?: number;
    cannotMulligan?: boolean;
  };
type LeaderFace = Abilities & Pick<Identity, 'name' | 'aspects' | 'traits'> & { title: string };
export type LeaderDefinition = Identity & { kind: 'leader' } & (
    | {
        printedCost: number;
        faces: {
          leader: Abilities;
          alternate?: never;
          upgrade?: UpgradeProfile;
          unit: Abilities & { power: number; hp: number; arena: Arena };
        };
      }
    | {
        printedCost: null;
        faces: {
          leader: LeaderFace;
          alternate: LeaderFace;
          unit?: never;
          upgrade?: never;
        };
      }
  );
export type UpgradeProfile = Abilities & {
  hostOnlyGrit?: boolean;
  hostLosesTraits?: readonly string[];
  hostDiscounts?: readonly { filter: UnitFilter; amount: number }[];
  ignorePilotLimit?: boolean;
  hostModifiers?: readonly { condition: Condition; power?: NumericValue; hp?: NumericValue }[];
  hostCannotReady?: boolean;
  doubleHostDamage?: boolean;
  defendingAttackerLosesOverwhelm?: boolean;
  grantsCondition?: Condition;
  grantsIf?: { trait: string };
  hostIsLeader?: boolean;
  hostTraits?: readonly string[];
  conditionalHostTraits?: readonly { condition: Condition; traits: readonly string[] }[];
  attackOverride?: readonly TriggerDefinition[];
  uniqueHostDiscount?: number;
  modifiers: { power: number; hp: number };
  attachTo: 'unit' | 'friendly-unit' | 'non-vehicle' | 'friendly-vehicle-without-pilot' | 'base';
  attachFilter?: UnitFilter;
  grants?: Abilities;
};
export type UpgradeDefinition = Identity &
  UpgradeProfile & {
    kind: 'upgrade';
    costReductions?: readonly { condition: Condition; amount: NumericValue }[];
    token: boolean;
    cost: number;
    replacement?: { kind: 'shield' };
  };
export type EventDefinition = Identity &
  Abilities & {
    kind: 'event';
    costReductions?: readonly { condition: Condition; amount: NumericValue }[];
    playOnlyFirstAction?: boolean;
    cannotPlayFromHand?: boolean;
    cost: number;
    effects: readonly CardEffect[];
    attackGrants?: readonly TriggerDefinition[];
  };
export type PlayerTokenDefinition = Identity &
  Abilities & {
    kind: 'player-token';
    tokenType: 'force' | 'credit';
    token: true;
    zone: 'base' | 'resources';
  };
export type CardDefinition =
  | PlayerTokenDefinition
  | UnitDefinition
  | BaseDefinition
  | LeaderDefinition
  | UpgradeDefinition
  | EventDefinition;
