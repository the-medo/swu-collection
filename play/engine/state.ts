import type { CatalogContext } from '../cards/catalog.ts';
import { assertCompatibleVersions } from '../cards/catalog.ts';
import { bundleVersionsSchema, type BundleVersions } from '../cards/version-contract.ts';
import { captureTriggers } from './triggers.ts';
import { containsRegroupOperation } from './delayed.ts';
import { numericValue } from './values.ts';
import { matchesUnit } from './targets.ts';
import { validBountyContext } from './bounty.ts';
import { matchingPlayModifiers, sharesFriendlyPlayKeyword } from './play-keywords.ts';
import { smuggleOptions } from './smuggle.ts';
import { assertDepartedAttachments } from './departed-attachments.ts';
import { cardAspects } from './identity.ts';
import { containsResourceRepayment } from './delayed.ts';
import { hasUpgradeWork, pendingUpgradeDefeats } from './upgrade-defeat.ts';
import { containsVictorySchedule } from './delayed.ts';
import { printedUnitStats, reconcilePrintedStats, assertPrintedStats } from './printed-stats.ts';
import { survivesZeroHp } from './lasting.ts';
import { historicalOwnerMatches } from './roles.ts';
import { conditionMatches } from './conditions.ts';
import { containsControlSchedule, controlSourceLeft } from './delayed.ts';
import { containsActionSchedule } from './delayed.ts';
import { rescueCaptured } from './capture.ts';
import { containsRescueSchedule, containsReturnSchedule } from './delayed.ts';
import { catalogFor } from '../cards/catalog.ts';
import { namedAbilityLoss } from './naming.ts';
import { matchesCard } from './inspection.ts';
import { effectiveAbilities } from './effective-abilities.ts';
import { z } from 'zod';
import { abilityOrigins, assertAbilityOrigins, originAbilities } from './effective-abilities.ts';
import { cardDefinition } from '../cards/catalog.ts';
import { isToken, isUpgrade, upgradeProfile } from './roles.ts';
import { hitPoints, unitProfile, activeAbilities } from './abilities.ts';
import { cardTraits, unitIsLeader } from './attributes.ts';
import {
  attachedUpgrades,
  isUnit,
  unitStats,
  captureObservers,
  defeatUpgrade,
  type AbilityObserver,
} from './attachments.ts';
import { uniqueConflict, collectTriggers, declaredTriggerObservers } from './triggers.ts';
import type { Aspect } from '../cards/definition.ts';
import { cardIdSchema, idSchema, versions } from './model.ts';
import type { CardInstance, CardReference, FactType, GameState, Zone } from './model.ts';

export const gameConfigSchema = z.strictObject({
  gameId: idSchema,
  versions: bundleVersionsSchema.optional(),
  initiativeChooser: idSchema.optional(),
  players: z.tuple([playerConfig(), playerConfig()]),
  disclosure: z
    .strictObject({ handsToPlayers: z.boolean(), handsToSpectators: z.boolean() })
    .default({ handsToPlayers: false, handsToSpectators: false }),
});
function playerConfig() {
  return z.strictObject({
    id: idSchema,
    base: cardIdSchema,
    leader: cardIdSchema,
    deck: z
      .array(z.strictObject({ cardId: cardIdSchema, quantity: z.number().int().min(1).max(120) }))
      .min(1)
      .max(120),
  });
}
export type GameConfig = z.input<typeof gameConfigSchema>;

export function emptyPhaseHistory(): GameState['phaseHistory'] {
  return {
    lastActions: {},
    defeatedAttacking: [],
    damageAttempts: [],
    damagedUnits: [],
    basesDamaged: [],
    basesAttacked: [],
    upgradesDefeated: [],
    cardsDrawn: {},
    discarded: [],
    enemyBaseDamage: {},
    unitEntries: [],
    left: [],
    defeated: [],
    attacks: [],
    forceUsed: {},
    actionsTaken: {},
    entered: [],
    baseDamageSources: [],
    enemyBaseDamaged: [],
    indirectDamage: [],
    tokensCreated: [],
    ownCardsDiscarded: [],
    played: [],
  };
}
export function emptyState(
  gameId: string,
  seats: [string, string],
  gameVersions: BundleVersions = versions,
): GameState {
  assertCompatibleVersions(gameVersions);
  if (seats[0] === seats[1]) throw new Error('Crossfire requires two distinct players');
  return {
    versions: { ...versions, engine: gameVersions.engine, cards: gameVersions.cards },
    gameId,
    revision: 0,
    nextId: 1,
    seats: [...seats],
    players: {},
    cards: {},
    attacks: [],
    delayedEffects: [],
    printedStatActivations: [],
    keywordGrants: [],
    lastingEffects: [],
    namedEffects: [],
    phaseHistory: emptyPhaseHistory(),
    actionHistory: null,
    departedUnits: [],
    departedUpgrades: [],
    defeatedAbilityBatches: [],
    usedDefeatedAbilities: [],
    usedAttackAbilities: [],
    usedPlayedAbilities: [],
    phaseTriggers: [],
    usedBounties: [],
    captured: [],
    setAside: [],
    searching: [],
    roundHistory: { plays: [], triggerUses: [], actionUses: [] },
    playPayment: null,
    playModifiers: [],
    playRestrictions: [],
    phaseStatModifiers: [],
    grantedPlays: [],
    ground: [],
    space: [],
    phase: 'setup',
    round: 0,
    activePlayer: seats[0],
    initiative: { holder: seats[0], claimed: false },
    consecutivePasses: 0,
    lastPassPlayer: null,
    execution: { frames: [], pendingTriggers: [], decision: null, random: null },
    disclosure: { handsToPlayers: false, handsToSpectators: false },
    result: null,
    facts: [],
  };
}

export function allocateId(state: GameState, prefix: string): string {
  return `${prefix}${state.nextId++}`;
}
export function opponent(state: GameState, player: string): string {
  if (!state.seats.includes(player)) throw new Error('Unknown Crossfire player');
  return state.seats[0] === player ? state.seats[1] : state.seats[0];
}
export function instance(state: GameState, id: string): CardInstance {
  const card = state.cards[id];
  if (!card) throw new Error('Unknown Crossfire instance');
  return card;
}
export function reference(card: CardReference): CardReference {
  return {
    instanceId: card.instanceId,
    cardId: card.cardId,
    ...(card.leaderSide ? { leaderSide: card.leaderSide } : {}),
    incarnation: card.incarnation,
    visibility: card.visibility,
  };
}
export function fact(
  state: GameState,
  type: FactType,
  actor: string | null = null,
  cards: CardReference[] = [],
  amount: number | null = null,
  audience: 'public' | string[] = 'public',
) {
  state.facts.push({
    seq: state.facts.length,
    type,
    actor,
    cards: cards.map(reference),
    amount,
    audience,
  });
}
export function isArena(zone: Zone): zone is 'ground' | 'space' {
  return zone === 'ground' || zone === 'space';
}
export function membership(state: GameState, card: CardInstance): string[] | null {
  if (cardDefinition(state, card.cardId).kind === 'player-token' && card.zone !== 'set-aside')
    return state.players[card.controller]!.tokens;
  if (card.zone === 'base') return null;
  if (card.zone === 'resources') return state.players[card.controller]!.resources;
  if (card.zone === 'deck' && state.searching.includes(card.instanceId)) return state.searching;
  if (card.zone === 'set-aside') return state.setAside;
  if (card.zone === 'captured') return state.captured;
  if (isArena(card.zone)) return state[card.zone];
  return state.players[card.owner]![card.zone];
}
export type Departure = {
  unit: GameState['departedUnits'][number];
  observers: AbilityObserver[];
  leftObservers: AbilityObserver[];
};
export function captureDeparture(
  state: GameState,
  card: CardInstance,
  observers = attachedUpgrades(state, card).length ? captureObservers(state) : [],
  leftObservers = declaredTriggerObservers(state, 'unit-left-play'),
): Departure {
  return {
    unit: {
      reference: reference(card),
      controller: card.controller,
      ...unitStats(state, card),
      printedPower: printedUnitStats(state, card).power,
      printedHp: printedUnitStats(state, card).hp,
      abilities: abilityOrigins(state, card),
      traits: [...cardTraits(state, card)],
      leaderUnit: unitIsLeader(state, card),
      upgraded: attachedUpgrades(state, card).length > 0,
      upgrades: structuredClone(attachedUpgrades(state, card)),
      damage: card.damage,
      arena: card.zone as 'ground' | 'space',
    },
    observers,
    leftObservers,
  };
}
export function captureUpgradeDeparture(state: GameState, card: CardInstance) {
  const parent = card.attachedTo && state.cards[card.attachedTo.instanceId];
  return {
    entry: {
      reference: reference(card),
      controller: card.controller,
      traits: [...cardTraits(state, card)],
      arena: card.zone as 'ground' | 'space',
      abilities: abilityOrigins(state, card),
    },
    detached:
      parent && parent.incarnation === card.attachedTo?.incarnation
        ? captureTriggers(state, 'detached', [card], parent, { silent: true })
        : [],
  };
}
export function move(
  state: GameState,
  card: CardInstance,
  zone: Zone,
  departure?: Departure,
  deferredRescues?: CardInstance[],
  upgradeDeparture?: ReturnType<typeof captureUpgradeDeparture>,
) {
  const definition = cardDefinition(state, card.cardId);
  if (
    isToken(definition) &&
    !isArena(zone) &&
    !(definition.kind === 'player-token' && zone === definition.zone)
  )
    zone = 'set-aside';
  if (card.zone === zone) return;
  reconcilePrintedStats(state);
  state.grantedPlays = state.grantedPlays.filter(p => p.target.instanceId !== card.instanceId);
  const attachments = isUnit(state, card) ? attachedUpgrades(state, card) : [];
  const leaving =
    isUnit(state, card) && !isArena(zone)
      ? (departure ?? captureDeparture(state, card))
      : undefined;
  const prisoners = leaving
    ? state.captured.filter(id => {
        const guard = state.cards[id]!.capturedBy;
        return guard?.instanceId === card.instanceId && guard.incarnation === card.incarnation;
      })
    : [];
  if (leaving) {
    state.departedUnits.push(leaving.unit);
    state.phaseHistory.left.push({
      ...structuredClone(card),
      traits: [...leaving.unit.traits],
      leaderUnit: leaving.unit.leaderUnit,
    });
    for (const observer of leaving.leftObservers)
      collectTriggers(state, 'unit-left-play', [observer.source], card, {
        origins: observer.origins,
      });
  }
  if (isUpgrade(state, card) && !isArena(zone) && !upgradeDeparture && card.attachedTo) {
    const parent = state.cards[card.attachedTo.instanceId];
    if (parent && parent.incarnation === card.attachedTo.incarnation)
      collectTriggers(state, 'detached', [card], parent);
  }
  if (isUpgrade(state, card) && !isArena(zone) && upgradeDeparture) {
    state.departedUpgrades.push(upgradeDeparture.entry);
    state.execution.pendingTriggers.push(...upgradeDeparture.detached);
    for (const trigger of upgradeDeparture.detached)
      fact(state, 'triggered', trigger.playerId, [trigger.source]);
  }
  if (isUpgrade(state, card) && !isArena(zone) && !upgradeDeparture)
    state.departedUpgrades.push({
      reference: reference(card),
      controller: card.controller,
      traits: [...cardTraits(state, card)],
      arena: card.zone as 'ground' | 'space',
      abilities: abilityOrigins(state, card),
    });
  if (zone !== 'captured') card.capturedBy = null;
  if (!isArena(zone)) {
    card.attachedTo = null;
    delete card.attachmentRestriction;
  }
  const previous = membership(state, card);
  if (previous) {
    const index = previous.indexOf(card.instanceId);
    if (index < 0) throw new Error('Cannot move an unplaced card');
    previous.splice(index, 1);
  }
  if (zone === 'deck' || zone === 'hand' || zone === 'resources') card.visibility++;
  // V8 §8.36: changing arenas does not leave play or create a new copy.
  if ((isArena(zone) && !isArena(card.zone)) || zone === 'resources' || zone === 'base')
    card.incarnation++;
  if (!(isArena(zone) && isArena(card.zone))) delete card.resourcesPaid;
  if (!isArena(zone)) card.controller = card.owner;
  card.zone = zone;
  membership(state, card)?.push(card.instanceId);
  if (isArena(zone)) for (const upgrade of attachments) move(state, upgrade, zone);
  else if (leaving)
    for (const upgrade of attachments) defeatUpgrade(state, upgrade, leaving.observers);
  for (const id of prisoners) {
    const prisoner = instance(state, id);
    if (deferredRescues) deferredRescues.push(prisoner);
    else rescueCaptured(state, prisoner);
  }
  reconcilePrintedStats(state);
}
// V8 §1.7.7: the instructed player controls the resource; printed ownership stays fixed.
export function changeResourceController(state: GameState, card: CardInstance, playerId: string) {
  if (card.zone !== 'resources') throw new Error('Expected a resource');
  if (card.controller !== playerId) {
    const previous = state.players[card.controller]!.resources;
    const index = previous.indexOf(card.instanceId);
    if (index < 0) throw new Error('Unplaced resource');
    previous.splice(index, 1);
    card.controller = playerId;
    state.players[playerId]!.resources.push(card.instanceId);
  }
}
export function resourceCard(
  state: GameState,
  card: CardInstance,
  playerId: string,
  ready = false,
) {
  move(state, card, 'resources');
  if (card.zone !== 'resources') return false;
  changeResourceController(state, card, playerId);
  card.damage = 0;
  card.exhausted = !ready;
  return true;
}
export function addCard(state: GameState, owner: string, cardId: string, zone: Zone): CardInstance {
  const definition = cardDefinition(state, cardId);
  const card: CardInstance = {
    instanceId: allocateId(state, 'c'),
    cardId,
    owner,
    controller: owner,
    zone,
    incarnation: ['base', 'resources', 'ground', 'space'].includes(zone) ? 1 : 0,
    visibility: 0,
    damage: 0,
    exhausted: definition.kind !== 'player-token' && (zone === 'resources' || isArena(zone)),
    deployedAs: null,
    capturedBy: null,
    attachedTo: null,
    abilityUses: {},
  };
  state.cards[card.instanceId] = card;
  membership(state, card)?.push(card.instanceId);
  return card;
}
export function addPlayer(state: GameState, id: string, base: string, leader: string) {
  if (
    cardDefinition(state, base).kind !== 'base' ||
    cardDefinition(state, leader).kind !== 'leader'
  ) {
    throw new Error('Crossfire requires a supported base and leader');
  }
  state.players[id] = {
    id,
    base: '',
    leader: '',
    tokens: [],
    deck: [],
    hand: [],
    resources: [],
    discard: [],
  };
  state.players[id]!.base = addCard(state, id, base, 'base').instanceId;
  state.players[id]!.leader = addCard(state, id, leader, 'base').instanceId;
}

export function initialState(input: GameConfig): GameState {
  const config = gameConfigSchema.parse(input);
  const state = emptyState(
    config.gameId,
    [config.players[0].id, config.players[1].id],
    config.versions,
  );
  state.disclosure = { ...config.disclosure };
  if (config.initiativeChooser && !state.seats.includes(config.initiativeChooser))
    throw new Error('The initiative chooser must be a player in this game');
  for (const player of config.players) {
    addPlayer(state, player.id, player.base, player.leader);
    const total = player.deck.reduce((sum, row) => sum + row.quantity, 0);
    if (total < minimumDeckSize(state, player.base) || total > 120)
      throw new Error('Core practice decks require 6–120 cards');
    if (new Set(player.deck.map(row => row.cardId)).size !== player.deck.length)
      throw new Error('Duplicate deck row');
    for (const row of player.deck) {
      const definition = cardDefinition(state, row.cardId);
      if (
        isToken(definition) ||
        (definition.kind !== 'unit' &&
          definition.kind !== 'event' &&
          !(definition.kind === 'upgrade' && !definition.token))
      )
        throw new Error('Unsupported main-deck card role');
      for (let n = 0; n < row.quantity; n++) addCard(state, player.id, row.cardId, 'deck');
    }
  }
  state.execution.frames = [{ kind: 'first-player' }];
  return state;
}

// V8 §§1.6, 1.8, 8.1: each missing icon adds two; repeated icons are counted.
export function aspectPenalty(required: readonly Aspect[], provided: readonly Aspect[]): number {
  const remaining = [...provided];
  return required.reduce((cost, aspect) => {
    const index = remaining.indexOf(aspect);
    if (index < 0) return cost + 2;
    remaining.splice(index, 1);
    return cost;
  }, 0);
}
export type PlayCostParts = { increased: number; reductions: Record<string, number> };
export function playCost(
  state: GameState,
  card: CardInstance,
  discount = 0,
  piloting?: string,
  target?: CardInstance,
  ignoreOneColoredPenalty = false,
  ignoreAspectPenalties = false,
  using?: 'plot' | 'smuggle',
  smuggle?: string,
  phaseAbilities?: import('../cards/definition.ts').SimpleAbilities,
  parts?: PlayCostParts,
  increased?: number,
): number {
  const definition = cardDefinition(state, card.cardId);
  if (
    isToken(definition) ||
    (definition.kind !== 'unit' &&
      definition.kind !== 'event' &&
      !(definition.kind === 'upgrade' && !definition.token))
  )
    throw new Error('Unsupported playable role');
  if (smuggle && piloting) throw new Error('Conflicting alternate costs');
  const alternate = smuggle
    ? smuggleOptions(state, card).find(c => c.id === smuggle)
    : piloting && definition.kind === 'unit'
      ? definition.piloting?.find(option => option.id === piloting)
      : undefined;
  if ((piloting || smuggle) && !alternate && increased === undefined)
    throw new Error('Unknown alternate play cost');
  const reductions: Record<string, number> = { instruction: discount };
  const player = state.players[card.controller]!;
  const providers = new Set([player.base, player.leader]);
  for (const unit of [...state.ground, ...state.space].map(id => instance(state, id)))
    if (
      isUnit(state, unit) &&
      unit.controller === card.controller &&
      effectiveAbilities(state, unit).providesAspects
    )
      providers.add(unit.instanceId);
  const provided = [...providers].flatMap(id => cardAspects(state, instance(state, id)));
  const asUnit = definition.kind === 'unit' && !piloting;
  let penalty = ignoreAspectPenalties
    ? 0
    : aspectPenalty(alternate?.aspects ?? definition.aspects, provided);
  for (const source of Object.values(state.cards)) {
    if (source.controller !== card.controller || !['base', 'ground', 'space'].includes(source.zone))
      continue;
    for (const exception of effectiveAbilities(state, source).ignoreAspectPenalties ?? []) {
      if (exception.filter.kind === 'unit' && !asUnit) continue;
      if (
        matchesCard(state, card, exception.filter, { source }) &&
        (!exception.condition ||
          conditionMatches(state, card.controller, exception.condition, { source }))
      )
        penalty = 0;
    }
  }
  if (
    ignoreOneColoredPenalty &&
    penalty > 0 &&
    aspectPenalty(
      (alternate?.aspects ?? definition.aspects).filter(a => a !== 'Heroism' && a !== 'Villainy'),
      provided,
    ) > 0
  )
    penalty = Math.max(0, penalty - 2);
  if (
    (asUnit || definition.kind === 'event' || definition.kind === 'upgrade') &&
    !namedAbilityLoss(state, card)
  )
    for (const [index, reduction] of (definition.costReductions ?? []).entries())
      if (conditionMatches(state, card.controller, reduction.condition, { source: card }))
        reductions[`printed-${index}`] = Math.max(
          0,
          numericValue(state, { source: card }, reduction.amount),
        );
  for (const source of Object.values(state.cards)) {
    if (source.controller !== card.controller || !['base', 'ground', 'space'].includes(source.zone))
      continue;
    for (const reduction of effectiveAbilities(state, source).playReductions ?? []) {
      if (reduction.filter.kind === 'unit' && !asUnit) continue;
      if (reduction.filter.playAs && asUnit) continue;
      if (!matchesCard(state, card, reduction.filter, { source })) continue;
      if (
        reduction.host &&
        (!target || !matchesUnit(state, target, source.controller, reduction.host, { source }))
      )
        continue;
      if (
        reduction.firstEachPhase &&
        state.phaseHistory.played.some(
          play =>
            play.playerId === card.controller &&
            (!reduction.filter.playAs || !isUnit(state, play.card)) &&
            (reduction.filter.kind !== 'unit' || isUnit(state, play.card)) &&
            matchesCard(state, play.card, reduction.filter, { source }) &&
            (!reduction.host ||
              (play.host &&
                matchesUnit(state, play.host, source.controller, reduction.host, { source }))),
        )
      )
        continue;
      if (
        reduction.firstEachRound &&
        state.roundHistory.plays.some(
          play =>
            play.card.controller === card.controller &&
            (!reduction.filter.playAs || !play.asUnit) &&
            (!reduction.filter.kind || reduction.filter.kind !== 'unit' || play.asUnit) &&
            (reduction.filter.whenDefeated === undefined ||
              play.whenDefeated === reduction.filter.whenDefeated) &&
            matchesCard(
              state,
              play.card,
              { ...reduction.filter, whenDefeated: undefined },
              { source },
            ) &&
            (!reduction.host ||
              (play.host &&
                matchesUnit(state, play.host, source.controller, reduction.host, { source }))),
        )
      )
        continue;
      reductions[`source-${source.instanceId}-${source.incarnation}-${reduction.id}`] =
        reduction.amount;
    }
  }
  for (const modifier of matchingPlayModifiers(state, card, asUnit, using))
    if (
      !modifier.discountIfSharesKeyword ||
      (asUnit && sharesFriendlyPlayKeyword(state, card, phaseAbilities, using))
    )
      reductions[`next-${modifier.id}`] = modifier.discount;
  if (
    definition.kind === 'upgrade' &&
    !namedAbilityLoss(state, card) &&
    target &&
    cardDefinition(state, target.cardId).unique
  )
    reductions['unique-host'] = definition.uniqueHostDiscount ?? 0;
  if (definition.kind === 'upgrade' && target && !namedAbilityLoss(state, card))
    for (const [index, reduction] of (definition.hostDiscounts ?? []).entries())
      if (matchesUnit(state, target, card.controller, reduction.filter, { source: card }))
        reductions[`host-${index}`] = reduction.amount;
  const surcharge = matchingPlayModifiers(state, card, asUnit, using).reduce(
    (sum, modifier) => sum + (modifier.phaseCost?.increase ?? 0),
    0,
  );
  const basis = increased ?? (alternate?.cost ?? definition.cost) + penalty + surcharge;
  if (parts) Object.assign(parts, { increased: basis, reductions });
  return Math.max(0, basis - Object.values(reductions).reduce((a, b) => a + b, 0));
}

export function minimumDeckSize(state: CatalogContext, baseId: string): number {
  const base = cardDefinition(state, baseId);
  return 6 + (base.kind === 'base' ? (base.minimumDeckIncrease ?? 0) : 0);
}
export function startingHandSize(state: GameState, playerId: string): number {
  const base = cardDefinition(state, instance(state, state.players[playerId]!.base).cardId);
  return (
    6 +
    (base.kind === 'base'
      ? (base.startingHandIncrease ?? 0) - (base.startingHandReduction ?? 0)
      : 0)
  );
}
export function assertState(state: GameState): void {
  if (
    state.playPayment &&
    (state.phase === 'ended' || !state.seats.includes(state.playPayment.playerId))
  )
    throw new Error('Invalid ongoing play payment');
  if (
    state.consecutivePasses === 0
      ? state.lastPassPlayer !== null
      : !state.lastPassPlayer || !state.seats.includes(state.lastPassPlayer)
  )
    throw new Error('Invalid consecutive pass history');
  if (
    state.seats[0] === state.seats[1] ||
    Object.keys(state.players).length !== 2 ||
    !state.seats.includes(state.activePlayer) ||
    !state.seats.includes(state.initiative.holder)
  )
    throw new Error('Invalid players');
  for (const modifier of state.phaseStatModifiers)
    if (
      !state.seats.includes(modifier.playerId) ||
      modifier.source.controller !== modifier.playerId ||
      modifier.round !== state.round ||
      modifier.phase !== state.phase
    )
      throw new Error('Invalid phase stat modifier');
  for (const permission of state.grantedPlays) {
    const card = state.cards[permission.target.instanceId];
    if (
      !card ||
      card.zone !== 'discard' ||
      !['unit', 'event', 'upgrade'].includes(cardDefinition(state, card.cardId).kind) ||
      JSON.stringify(reference(card)) !== JSON.stringify(reference(permission.target)) ||
      !state.seats.includes(permission.playerId) ||
      !state.seats.includes(permission.source.controller) ||
      permission.playerId !==
        (permission.recipient === 'self'
          ? permission.source.controller
          : opponent(state, permission.source.controller)) ||
      permission.round !== state.round ||
      permission.phase !== state.phase ||
      (permission.scope === 'source' &&
        (permission.source.instanceId !== card.instanceId ||
          permission.source.cardId !== card.cardId ||
          permission.source.incarnation !== card.incarnation ||
          permission.source.owner !== card.owner))
    )
      throw new Error('Invalid granted discard play');
  }
  for (const modifier of state.playModifiers)
    if (
      !state.seats.includes(modifier.playerId) ||
      (modifier.bounty !== undefined
        ? !validBountyContext(state, modifier.source, modifier.playerId, modifier.bounty)
        : modifier.playerId !==
          (modifier.phaseCost?.recipient === 'enemy'
            ? opponent(state, modifier.source.controller)
            : modifier.source.controller)) ||
      modifier.round !== state.round ||
      modifier.phase !== state.phase
    )
      throw new Error('Invalid next-play modifier');
  for (const play of state.roundHistory.plays)
    if (
      !state.seats.includes(play.card.controller) ||
      !state.cards[play.card.instanceId] ||
      state.cards[play.card.instanceId]!.cardId !== play.card.cardId ||
      state.cards[play.card.instanceId]!.incarnation < play.card.incarnation ||
      (play.host &&
        (play.asUnit ||
          !isUnit(state, play.host) ||
          !state.seats.includes(play.host.controller) ||
          !state.cards[play.host.instanceId] ||
          state.cards[play.host.instanceId]!.cardId !== play.host.cardId ||
          state.cards[play.host.instanceId]!.incarnation < play.host.incarnation))
    )
      throw new Error('Invalid play history');
  const seen = new Set<string>();
  const claim = (id: string, zone: Zone, owner?: string) => {
    const card = instance(state, id);
    if (seen.has(id) || card.zone !== zone || (owner && card.owner !== owner))
      throw new Error('Invalid zone membership');
    seen.add(id);
  };
  for (const id of state.seats) {
    const player = state.players[id];
    if (!player || player.id !== id) throw new Error('Invalid player identity');
    claim(player.base, 'base', id);
    if (cardDefinition(state, instance(state, player.base).cardId).kind !== 'base')
      throw new Error('Invalid base');
    const leader = instance(state, player.leader);
    if (cardDefinition(state, leader.cardId).kind !== 'leader' || leader.owner !== id)
      throw new Error('Invalid leader');
    if (!leader.deployedAs) claim(player.leader, 'base', id);
    if (player.tokens.filter(id => instance(state, id).cardId === 'the-force').length > 1)
      throw new Error('Only one Force token per player');
    for (const token of player.tokens) {
      const definition = cardDefinition(state, instance(state, token).cardId);
      if (definition.kind !== 'player-token') throw new Error('Invalid player token');
      if (instance(state, token).controller !== id)
        throw new Error('Incorrect player token controller');
      claim(token, definition.zone);
    }
    for (const zone of ['deck', 'hand', 'resources', 'discard'] as const) {
      for (const cardId of player[zone]) {
        claim(cardId, zone, zone === 'resources' ? undefined : id);
        if (zone === 'resources' && instance(state, cardId).controller !== id)
          throw new Error('Incorrect resource controller');
      }
    }
  }
  for (const zone of ['ground', 'space'] as const)
    for (const card of state[zone]) claim(card, zone);
  for (const card of state.captured) claim(card, 'captured');
  for (const card of state.setAside) claim(card, 'set-aside');
  for (const card of state.searching) claim(card, 'deck');
  const nonTokens = Object.values(state.cards).filter(card => {
    const d = cardDefinition(state, card.cardId);
    return !isToken(d);
  });
  if (seen.size !== Object.keys(state.cards).length || nonTokens.length > 244)
    throw new Error('Unplaced or excessive cards');
  for (const [id, card] of Object.entries(state.cards)) {
    const definition = cardDefinition(state, card.cardId);
    if (
      card.instanceId !== id ||
      !state.seats.includes(card.owner) ||
      !state.seats.includes(card.controller) ||
      (!isArena(card.zone) && card.controller !== card.owner && card.zone !== 'resources')
    )
      throw new Error('Invalid card identity/control');
    if (
      isToken(definition) &&
      !isArena(card.zone) &&
      card.zone !== 'set-aside' &&
      !(definition.kind === 'player-token' && card.zone === definition.zone)
    )
      throw new Error('Token outside play');
    if (
      isArena(card.zone) &&
      (definition.kind === 'base' ||
        definition.kind === 'player-token' ||
        definition.kind === 'event')
    )
      throw new Error('Invalid arena');
    if (card.attachmentRestriction && !isUpgrade(state, card))
      throw new Error('Invalid conversion restriction role');
    if (card.attachmentRestriction?.kind === 'exact-host') {
      const host = state.cards[card.attachmentRestriction.host.instanceId];
      if (
        !isUpgrade(state, card) ||
        !host ||
        host.incarnation < card.attachmentRestriction.host.incarnation ||
        card.attachmentRestriction.host.instanceId !== card.attachedTo?.instanceId ||
        card.attachmentRestriction.host.incarnation !== card.attachedTo?.incarnation
      )
        throw new Error('Invalid attachment restriction');
    }
    if (definition.kind === 'upgrade' || isUpgrade(state, card)) {
      if (!upgradeProfile(definition)) throw new Error('Unsupported attached role');
      if (isArena(card.zone) && card.exhausted) throw new Error('Upgrade cannot be exhausted');
      if (
        (definition.kind === 'leader' ? card.deployedAs !== 'upgrade' : card.deployedAs !== null) ||
        card.zone === 'base' ||
        isArena(card.zone) !== (card.attachedTo !== null)
      )
        throw new Error('Invalid upgrade role');
      if (
        definition.kind === 'upgrade' &&
        definition.token &&
        !(isArena(card.zone) || card.zone === 'set-aside')
      )
        throw new Error('Token outside play');
      if (card.attachedTo) {
        const parent = state.cards[card.attachedTo.instanceId];
        const pending = pendingUpgradeDefeats(state).some(
          f => f.card.instanceId === card.instanceId && f.card.incarnation === card.incarnation,
        );
        const endedReplacement =
          state.phase === 'ended' &&
          upgradeProfile(definition)?.defeatToUnit === true &&
          state.departedUnits.some(
            d =>
              d.reference.instanceId === card.attachedTo!.instanceId &&
              d.reference.incarnation === card.attachedTo!.incarnation,
          );
        if (
          !parent ||
          (!pending &&
            !endedReplacement &&
            (!isUnit(state, parent) ||
              parent.zone !== card.zone ||
              parent.incarnation !== card.attachedTo.incarnation))
        )
          throw new Error('Invalid attachment parent');
        if (definition.kind === 'upgrade' && definition.token && card.owner !== parent.controller)
          throw new Error('Invalid token upgrade ownership');
      }
    } else if (card.attachedTo !== null) throw new Error('Unsupported attached role');
    if (card.zone === 'captured') {
      const guard = card.capturedBy && state.cards[card.capturedBy.instanceId];
      if (
        definition.kind !== 'unit' ||
        definition.token ||
        !guard ||
        guard.instanceId === card.instanceId ||
        guard.incarnation !== card.capturedBy!.incarnation ||
        !(isUnit(state, guard) || cardDefinition(state, guard.cardId).kind === 'base') ||
        card.exhausted ||
        card.damage ||
        card.attachedTo
      )
        throw new Error('Invalid captured unit');
    } else if (card.capturedBy) throw new Error('Capture link outside captivity');
    if (card.zone === 'set-aside' && !isToken(definition))
      throw new Error('Invalid set-aside card');
    if (
      definition.kind === 'player-token' &&
      ((card.zone !== definition.zone && card.zone !== 'set-aside') ||
        (card.zone === definition.zone &&
          !state.players[card.controller]!.tokens.includes(card.instanceId)) ||
        card.exhausted ||
        card.deployedAs !== null)
    )
      throw new Error('Invalid player token role');
    if (
      card.leaderSide &&
      (definition.kind !== 'leader' || !definition.faces.alternate || card.deployedAs !== null)
    )
      throw new Error('Invalid alternate leader side');
    if (
      definition.kind === 'leader' &&
      !definition.faces.unit &&
      (card.deployedAs !== null || card.zone !== 'base' || card.damage !== 0)
    )
      throw new Error('Leader without a unit face must stay in the base zone');
    if (definition.kind === 'base' && (card.zone !== 'base' || card.deployedAs !== null))
      throw new Error('Invalid base zone');
    const actions =
      definition.kind === 'leader'
        ? Object.values(definition.faces).flatMap(face => face.actions ?? [])
        : [
            ...(definition.actions ?? []),
            ...(definition.kind === 'unit' ? (definition.upgrade?.actions ?? []) : []),
          ];
    if (Object.keys(card.abilityUses).some(id => !actions.some(action => action.id === id)))
      throw new Error('Unknown ability usage history');
    if (
      definition.kind === 'event' &&
      (card.zone === 'base' || isArena(card.zone) || card.deployedAs !== null)
    )
      throw new Error('Invalid event role');
    if (definition.kind === 'unit' && (card.zone === 'base' || card.deployedAs !== null))
      throw new Error('Invalid unit role');
    if (
      definition.kind === 'leader' &&
      (card.controller !== card.owner ||
        (card.deployedAs === 'unit'
          ? !isUnit(state, card)
          : card.deployedAs === 'upgrade'
            ? !isUpgrade(state, card) || !card.attachedTo || !definition.faces.upgrade
            : card.zone !== 'base'))
    )
      throw new Error('Invalid leader face');
    if (card.damage && !(isUnit(state, card) || definition.kind === 'base'))
      throw new Error('Damage outside an eligible zone');
    if (
      (definition.kind === 'base' ||
        (state.execution.frames[0]?.kind !== 'unique' && !hasUpgradeWork(state))) &&
      state.phase !== 'ended' &&
      (isUnit(state, card) || definition.kind === 'base') &&
      card.damage >= (isUnit(state, card) ? unitStats(state, card).hp : hitPoints(definition)) &&
      (!isUnit(state, card) || !survivesZeroHp(state, card))
    )
      throw new Error('Unsettled defeat');
  }
  if (
    state.phase !== 'ended' &&
    uniqueConflict(state) &&
    !hasUpgradeWork(state) &&
    state.execution.frames[0]?.kind !== 'unique'
  )
    throw new Error('Unsettled uniqueness');
  const endings = state.execution.frames
    .filter(frame => frame.kind === 'end-attack')
    .map(frame => frame.attackId);
  if (
    JSON.stringify(endings) !== JSON.stringify(state.attacks.map(attack => attack.id).reverse()) ||
    new Set(endings).size !== endings.length
  )
    throw new Error('Invalid attack continuations');
  const actionKeys = new Set<string>();
  for (const use of state.roundHistory.actionUses) {
    for (const ref of [use.source, use.origin]) {
      const current = state.cards[ref.instanceId];
      if (
        !current ||
        current.cardId !== ref.cardId ||
        current.incarnation < ref.incarnation ||
        current.visibility < ref.visibility
      )
        throw new Error('Invalid action usage source');
    }
    const key = JSON.stringify([
      use.source.instanceId,
      use.source.incarnation,
      use.origin.instanceId,
      use.origin.incarnation,
      use.abilityId,
    ]);
    if (actionKeys.has(key)) throw new Error('Duplicate action usage');
    actionKeys.add(key);
  }
  const usageKeys = new Set<string>();
  for (const key of state.roundHistory.triggerUses) {
    const value: unknown = JSON.parse(key);
    if (
      !Array.isArray(value) ||
      value.length !== 3 ||
      typeof value[0] !== 'string' ||
      !Number.isSafeInteger(value[1]) ||
      value[1] < 0 ||
      typeof value[2] !== 'string' ||
      usageKeys.has(key)
    )
      throw new Error('Invalid trigger usage');
    const card = state.cards[value[0]];
    if (!card || card.instanceId !== value[0] || card.incarnation < value[1])
      throw new Error('Invalid trigger usage source');
    usageKeys.add(key);
  }
  for (const attack of state.attacks) {
    if (!state.seats.includes(attack.defendingPlayer)) throw new Error('Invalid defending player');
    if (
      new Set(attack.removedFromCombat.map(ref => ref.instanceId)).size !==
        attack.removedFromCombat.length ||
      attack.removedFromCombat.some(
        ref =>
          ![attack.attacker, attack.defender].some(
            participant =>
              participant.instanceId === ref.instanceId &&
              participant.incarnation === ref.incarnation &&
              participant.cardId === ref.cardId,
          ),
      )
    )
      throw new Error('Invalid removed attack participant');
    if (attack.ending) {
      const { source, abilities } = attack.ending;
      const observed = new Set<string>();
      for (const observer of attack.ending.observers) {
        const current = state.cards[observer.source.instanceId];
        assertAbilityOrigins(state, observer.origins);
        if (
          !current ||
          current.cardId !== observer.source.cardId ||
          !historicalOwnerMatches(state, current, observer.source) ||
          observer.source.incarnation > current.incarnation ||
          observer.source.controller !== source.controller ||
          observed.has(observer.source.instanceId) ||
          JSON.stringify(observer.origins.find(o => o.id === 'self')?.card) !==
            JSON.stringify(observer.source)
        )
          throw new Error('Invalid attack ending observer');
        observed.add(observer.source.instanceId);
      }
      assertAbilityOrigins(state, abilities);
      if (
        source.instanceId !== attack.attacker.instanceId ||
        source.incarnation !== attack.attacker.incarnation ||
        source.cardId !== attack.attacker.cardId ||
        !isUnit(state, source) ||
        JSON.stringify(abilities.find(a => a.id === 'self')?.card) !== JSON.stringify(source)
      )
        throw new Error('Invalid attack ending source');
    }
    const defeatedKeys = new Set<string>();
    for (const ref of attack.defeated) {
      const key = JSON.stringify([ref.instanceId, ref.incarnation]);
      if (
        defeatedKeys.has(key) ||
        !state.phaseHistory.defeated.some(
          c =>
            c.instanceId === ref.instanceId &&
            c.incarnation === ref.incarnation &&
            c.cardId === ref.cardId,
        )
      )
        throw new Error('Invalid attack defeat history');
      defeatedKeys.add(key);
    }
    if (attack.excessToUnit) {
      const source = attack.excessToUnit.source,
        current = state.cards[source.instanceId];
      const definition = cardDefinition(state, source.cardId);
      if (
        !current ||
        current.cardId !== source.cardId ||
        current.incarnation < source.incarnation ||
        !state.seats.includes(source.controller) ||
        definition.kind !== 'event' ||
        !definition.effects.some(e => e.kind === 'attack-with-unit' && e.redirectExcess)
      )
        throw Error('Invalid excess damage permission');
    }
    if (attack.routedExcess) {
      const target = state.cards[attack.routedExcess.instanceId];
      if (
        !attack.excessToUnit ||
        !target ||
        target.cardId !== attack.routedExcess.cardId ||
        target.incarnation < attack.routedExcess.incarnation ||
        !['unit', 'leader'].includes(cardDefinition(state, target.cardId).kind) ||
        (target.instanceId === attack.defender.instanceId &&
          attack.routedExcess.incarnation === attack.defender.incarnation)
      )
        throw Error('Invalid redirected combat target');
    }
    for (const damage of attack.combatDamage) {
      const source = [attack.attacker, attack.defender].find(
        r =>
          r.instanceId === damage.source.instanceId &&
          r.incarnation === damage.source.incarnation &&
          r.cardId === damage.source.cardId,
      );
      const target = state.cards[damage.target.instanceId];
      if (
        !source ||
        !target ||
        target.cardId !== damage.target.cardId ||
        target.incarnation < damage.target.incarnation ||
        damage.amount <= 0
      )
        throw new Error('Invalid combat damage history');
      const legal =
        source === attack.attacker
          ? [
              attack.defender,
              ...(attack.routedExcess ? [attack.routedExcess] : []),
              reference(instance(state, state.players[attack.defendingPlayer]!.base)),
            ]
          : [attack.attacker];
      if (
        !legal.some(
          r =>
            r.instanceId === damage.target.instanceId &&
            r.incarnation === damage.target.incarnation,
        )
      )
        throw new Error('Invalid combat damage target');
    }
    const damageSources = new Set<string>();
    for (const ref of attack.baseDamageSources) {
      const current = state.cards[ref.instanceId];
      const key = ref.instanceId + ':' + ref.incarnation;
      if (
        !current ||
        current.cardId !== ref.cardId ||
        current.incarnation < ref.incarnation ||
        current.visibility < ref.visibility ||
        damageSources.has(key)
      )
        throw new Error('Invalid attack base damage source');
      damageSources.add(key);
    }
    assertAbilityOrigins(state, attack.grantedAbilities);
    if (
      attack.grantedAbilities.some(
        origin =>
          (!['lasting', 'attack-grant', 'discarded-unit'].includes(origin.profile) &&
            !origin.withoutSupport) ||
          origin.id === 'self',
      )
    )
      throw new Error('Invalid attack ability grant');
    for (const ref of [attack.attacker, attack.defender]) {
      const card = state.cards[ref.instanceId];
      if (!card || card.cardId !== ref.cardId || card.incarnation < ref.incarnation)
        throw new Error('Invalid attack reference');
    }
  }
  for (const history of [
    state.phaseHistory.basesDamaged,
    state.phaseHistory.basesAttacked,
    state.phaseHistory.upgradesDefeated,
    state.phaseHistory.enemyBaseDamaged,
    state.phaseHistory.indirectDamage,
    state.phaseHistory.tokensCreated,
    state.phaseHistory.ownCardsDiscarded,
  ]) {
    if (new Set(history).size !== history.length || history.some(id => !state.seats.includes(id)))
      throw new Error('Invalid phase player history');
  }
  for (const play of state.phaseHistory.played) {
    if (play.host) {
      const current = state.cards[play.host.instanceId];
      if (
        !current ||
        current.cardId !== play.host.cardId ||
        current.incarnation < play.host.incarnation ||
        !isUnit(state, play.host) ||
        !state.seats.includes(play.host.controller) ||
        play.card.attachedTo?.instanceId !== play.host.instanceId ||
        play.card.attachedTo?.incarnation !== play.host.incarnation
      )
        throw new Error('Invalid historical upgrade host');
    }
    const current = state.cards[play.card.instanceId];
    if (
      !state.seats.includes(play.playerId) ||
      play.card.controller !== play.playerId ||
      !current ||
      current.cardId !== play.card.cardId ||
      current.incarnation < play.card.incarnation ||
      current.visibility < play.card.visibility ||
      !historicalOwnerMatches(state, current, play.card)
    )
      throw new Error('Invalid phase play history');
  }
  for (const [player, action] of Object.entries(state.phaseHistory.lastActions))
    if (!state.seats.includes(player) || action.basesAttacked.some(id => !state.seats.includes(id)))
      throw new Error('Invalid previous action history');
  if (state.actionHistory?.basesAttacked.some(id => !state.seats.includes(id)))
    throw new Error('Invalid current action bases');
  for (const card of state.phaseHistory.defeatedAttacking)
    if (
      !state.phaseHistory.defeated.some(
        d =>
          d.instanceId === card.instanceId &&
          d.incarnation === card.incarnation &&
          d.cardId === card.cardId &&
          d.controller === card.controller,
      )
    )
      throw new Error('Invalid attacking defeat history');
  for (const ref of [
    ...state.phaseHistory.discarded.map(d => d.card),
    ...state.phaseHistory.damageAttempts,
    ...state.phaseHistory.damagedUnits,
    ...state.phaseHistory.entered,
    ...state.phaseHistory.baseDamageSources,
    ...(state.actionHistory?.attacks ?? []),
  ]) {
    const card = state.cards[ref.instanceId];
    if (
      !card ||
      card.cardId !== ref.cardId ||
      card.incarnation < ref.incarnation ||
      card.visibility < ref.visibility
    )
      throw new Error('Invalid phase reference history');
  }
  if (state.phaseHistory.discarded.some(d => !state.seats.includes(d.owner)))
    throw new Error('Invalid discard owner');
  const damagedUnits = new Set<string>();
  for (const ref of state.phaseHistory.damagedUnits) {
    const definition = cardDefinition(state, ref.cardId),
      key = `${ref.instanceId}:${ref.incarnation}`;
    if (!['unit', 'leader'].includes(definition.kind) || damagedUnits.has(key))
      throw new Error('Invalid unit damage history');
    damagedUnits.add(key);
  }
  const baseDamageSources = new Set<string>();
  for (const ref of state.phaseHistory.baseDamageSources) {
    const definition = cardDefinition(state, ref.cardId);
    const key = JSON.stringify([ref.instanceId, ref.incarnation]);
    if ((definition.kind !== 'unit' && definition.kind !== 'leader') || baseDamageSources.has(key))
      throw new Error('Invalid base damage source history');
    baseDamageSources.add(key);
  }
  for (const counts of [state.phaseHistory.cardsDrawn, state.phaseHistory.enemyBaseDamage])
    if (Object.keys(counts).some(id => !state.seats.includes(id)))
      throw new Error('Invalid phase counter');
  if (Object.keys(state.phaseHistory.actionsTaken).some(id => !state.seats.includes(id)))
    throw new Error('Invalid action history');
  if (Object.keys(state.phaseHistory.forceUsed).some(id => !state.seats.includes(id)))
    throw new Error('Invalid Force history');
  for (const defeated of [
    ...state.phaseHistory.defeated,
    ...state.phaseHistory.attacks,
    ...state.phaseHistory.unitEntries,
    ...state.phaseHistory.left,
  ]) {
    const current = state.cards[defeated.instanceId];
    if (
      !current ||
      current.cardId !== defeated.cardId ||
      !historicalOwnerMatches(state, current, defeated) ||
      current.incarnation < defeated.incarnation ||
      !state.seats.includes(defeated.controller) ||
      !isUnit(state, defeated)
    )
      throw new Error('Invalid phase history');
  }
  const restrictionIds = new Set<string>();
  for (const restriction of state.playRestrictions) {
    const source = state.cards[restriction.source.instanceId];
    if (
      !source ||
      source.cardId !== restriction.source.cardId ||
      source.incarnation < restriction.source.incarnation ||
      source.visibility < restriction.source.visibility ||
      !historicalOwnerMatches(state, source, restriction.source) ||
      !state.seats.includes(restriction.playerId) ||
      !state.seats.includes(restriction.source.controller) ||
      restriction.round !== state.round ||
      restriction.phase !== state.phase ||
      restrictionIds.has(restriction.id)
    )
      throw new Error('Invalid play restriction');
    restrictionIds.add(restriction.id);
  }
  const namedIds = new Set<string>();
  for (const effect of state.namedEffects) {
    const source = state.cards[effect.source.instanceId];
    if (
      !source ||
      source.cardId !== effect.source.cardId ||
      source.incarnation < effect.source.incarnation ||
      !state.seats.includes(effect.playerId) ||
      !catalogFor(state).hasTitle(effect.name) ||
      (effect.expires.kind === 'phase' && effect.expires.round > state.round) ||
      namedIds.has(effect.id)
    )
      throw new Error('Invalid named-card restriction');
    namedIds.add(effect.id);
  }
  assertPrintedStats(state);
  const lastingIds = new Set<string>();
  for (const effect of state.lastingEffects) {
    const target = state.cards[effect.target.instanceId],
      source = state.cards[effect.source.instanceId];
    if (
      !target ||
      target.cardId !== effect.target.cardId ||
      target.incarnation < effect.target.incarnation ||
      !source ||
      source.cardId !== effect.source.cardId ||
      !historicalOwnerMatches(state, source, effect.source) ||
      source.incarnation < effect.source.incarnation ||
      !state.seats.includes(effect.source.controller) ||
      lastingIds.has(effect.id)
    )
      throw new Error('Invalid lasting effect reference');
    lastingIds.add(effect.id);
    const expiry = effect.expires;
    if (effect.skipRegroupReady && expiry.kind !== 'next-regroup')
      throw new Error('Invalid regroup readiness expiry');
    if (
      expiry.kind === 'phase'
        ? expiry.phase !== state.phase || expiry.round !== state.round
        : expiry.kind === 'round'
          ? expiry.round !== state.round
          : expiry.kind === 'next-regroup'
            ? expiry.round < state.round || expiry.round > state.round + 1
            : expiry.kind === 'attack' && !state.attacks.some(a => a.id === expiry.attackId)
    )
      throw new Error('Invalid lasting effect expiry');
  }
  const delayedIds = new Set<string>();
  for (const delayed of [
    ...state.delayedEffects,
    ...state.execution.frames.flatMap(frame =>
      frame.kind === 'delayed-batch' ? frame.effects : [],
    ),
  ]) {
    const source = state.cards[delayed.source.instanceId];
    const definition = source && cardDefinition(state, source.cardId);
    const regroupOperation = delayed.kind === 'regroup-operation';
    const resourceRepayment =
      delayed.kind === 'resources-at-regroup' || delayed.kind === 'resources-at-action';
    const controlReturn =
      delayed.kind === 'control-at-regroup' || delayed.kind === 'control-on-departure';
    if (
      !source ||
      delayed.source.cardId !== source.cardId ||
      delayed.source.incarnation > source.incarnation ||
      !historicalOwnerMatches(state, source, delayed.source) ||
      (!controlReturn &&
        !resourceRepayment &&
        !regroupOperation &&
        delayed.source.zone !== 'discard') ||
      delayed.source.visibility > source.visibility ||
      delayed.source.controller !== delayed.playerId ||
      !state.seats.includes(delayed.playerId) ||
      (!controlReturn && !resourceRepayment && !regroupOperation && definition?.kind !== 'event') ||
      delayedIds.has(delayed.id) ||
      (delayed.kind !== 'control-on-departure' && delayed.dueRound < state.round)
    )
      throw new Error('Invalid delayed effect');
    if ('origin' in delayed && delayed.origin) assertAbilityOrigins(state, [delayed.origin]);
    if (delayed.kind === 'regroup-operation') {
      const target = state.cards[delayed.target.instanceId];
      if (
        !target ||
        target.cardId !== delayed.target.cardId ||
        target.incarnation < delayed.target.incarnation ||
        target.visibility < delayed.target.visibility ||
        !['unit', 'upgrade'].includes(cardDefinition(state, target.cardId).kind) ||
        !containsRegroupOperation(
          delayed.origin
            ? originAbilities(state, delayed.origin)
            : activeAbilities(state, delayed.source),
          delayed.operation,
        )
      )
        throw new Error('Invalid regroup operation');
    } else if (resourceRepayment) {
      if (
        !containsResourceRepayment(
          delayed.origin
            ? originAbilities(state, delayed.origin)
            : activeAbilities(state, delayed.source),
          delayed.kind === 'resources-at-regroup' ? 'regroup' : 'next-action',
        )
      )
        throw new Error('Invalid delayed resource repayment');
    } else if (delayed.kind === 'victory-at-regroup') {
      if (
        definition?.kind !== 'event' ||
        !containsVictorySchedule(definition.effects, delayed.arena)
      )
        throw new Error('Invalid delayed victory');
    } else if (delayed.kind === 'effects-at-action') {
      if (
        definition?.kind !== 'event' ||
        !containsActionSchedule(definition.effects, delayed.effects)
      )
        throw new Error('Invalid delayed action effects');
    } else {
      const target = state.cards[delayed.target.instanceId];
      if (
        !target ||
        delayed.target.visibility > target.visibility ||
        delayed.target.cardId !== target.cardId ||
        delayed.target.incarnation > target.incarnation ||
        cardDefinition(state, target.cardId).kind !== 'unit' ||
        !(controlReturn
          ? containsControlSchedule(
              delayed.origin
                ? originAbilities(state, delayed.origin)
                : activeAbilities(state, delayed.source),
              delayed.kind === 'control-at-regroup' ? 'regroup' : 'source-leaves',
            )
          : definition?.kind === 'event' &&
            (delayed.kind === 'defeat-at-regroup'
              ? definition.effects.some(e => e.kind === 'play-unit' && e.defeatAtRegroup)
              : delayed.kind === 'return-at-regroup'
                ? containsReturnSchedule(definition.effects)
                : containsRescueSchedule(definition.effects)))
      )
        throw new Error('Invalid delayed effect');
    }
    delayedIds.add(delayed.id);
  }
  if (
    state.delayedEffects.some(
      effect =>
        effect.kind !== 'effects-at-action' &&
        effect.kind !== 'resources-at-action' &&
        effect.kind !== 'control-on-departure' &&
        state.phase === 'regroup' &&
        effect.dueRound === state.round,
    ) &&
    state.execution.frames[0]?.kind !== 'regroup-delayed'
  )
    throw new Error('Uncollected regroup effect');
  if (
    state.delayedEffects.some(
      e =>
        (e.kind === 'effects-at-action' || e.kind === 'resources-at-action') &&
        e.dueRound === state.round &&
        state.phase === 'action',
    )
  )
    throw new Error('Uncollected action effect');
  if (
    state.delayedEffects.some(e => e.kind === 'control-on-departure' && controlSourceLeft(state, e))
  )
    throw new Error('Uncollected departure effect');
  const grants = new Set<string>();
  for (const grant of state.keywordGrants) {
    if (grants.has(grant.id) || !state.seats.includes(grant.playerId))
      throw new Error('Invalid keyword grant');
    grants.add(grant.id);
    assertAbilityOrigins(state, [
      {
        id: grant.id,
        card: grant.source,
        profile: 'lasting',
        withoutSupport: false,
        abilities: grant.abilities,
      },
    ]);
  }
  const departed = new Set<string>();
  for (const entry of state.departedUnits) {
    assertDepartedAttachments(state, entry);
    assertAbilityOrigins(state, entry.abilities);
    const card = state.cards[entry.reference.instanceId];
    const definition = card && cardDefinition(state, card.cardId);
    const key = `${entry.reference.instanceId}:${entry.reference.incarnation}`;
    if (
      !card ||
      card.cardId !== entry.reference.cardId ||
      entry.reference.incarnation > card.incarnation ||
      (entry.reference.incarnation === card.incarnation && isArena(card.zone)) ||
      !state.seats.includes(entry.controller) ||
      !definition ||
      (definition.kind !== 'unit' && definition.kind !== 'leader') ||
      departed.has(key)
    )
      throw new Error('Invalid departed unit history');
    departed.add(key);
  }
  for (const entry of state.departedUpgrades) {
    assertAbilityOrigins(state, entry.abilities);
    const card = state.cards[entry.reference.instanceId];
    const key = `${entry.reference.instanceId}:${entry.reference.incarnation}`;
    const self = entry.abilities.find(o => o.id === 'self');
    if (
      !card ||
      card.cardId !== entry.reference.cardId ||
      entry.reference.incarnation > card.incarnation ||
      entry.reference.visibility > card.visibility ||
      (entry.reference.incarnation === card.incarnation && isArena(card.zone)) ||
      !state.seats.includes(entry.controller) ||
      !self ||
      !isUpgrade(state, self.card) ||
      self.card.instanceId !== entry.reference.instanceId ||
      self.card.incarnation !== entry.reference.incarnation ||
      departed.has(key)
    )
      throw new Error('Invalid departed upgrade history');
    departed.add(key);
  }
  if ((state.phase === 'ended') !== (state.result !== null)) throw new Error('Invalid game result');
  if (state.result?.winner && !state.seats.includes(state.result.winner))
    throw new Error('Invalid winner');
  if (state.execution.random && state.execution.decision)
    throw new Error('Conflicting suspensions');
}
