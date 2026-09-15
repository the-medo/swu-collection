import { assertCompatibleVersions } from '../cards/catalog.ts';
import { captureUpgradeDeparture } from './state.ts';
import type { DefeatPreparation } from './model.ts';
import { freePlayOffer } from './exploit.ts';
import { resourcePayment } from './resource-payment.ts';
import { decisionForPlayer, resourcePlan, validResourcePlan } from './resource-plans.ts';
import { captureTriggers } from './triggers.ts';
import {
  deferUnitDefeat,
  unitDefeatChoice,
  defeatAttachmentTargets,
  defeatAttachmentFilter,
} from './unit-defeat.ts';
import { schedulePhaseTrigger, takePhaseTriggers } from './phase-triggers.ts';
import { repeatPlayedAbility } from './triggers.ts';
import { sequenceIntents, assertSequence } from './sequences.ts';
import { capturePairs } from './capture.ts';
import { activeAbilities } from './abilities.ts';
import { abilitiesFrom } from './effective-abilities.ts';
import { triggerAvailable } from './triggers.ts';
import { excessDamageChoice, finishExcessRouting } from './excess-damage.ts';
import { readyInPlay } from './ready.ts';
import {
  declarationEffect,
  exploitForIntent,
  exploitCost,
  canFinishExploit,
  rollbackExploit,
} from './exploit.ts';
import { repeatBounty } from './triggers.ts';
import { matchingPlayModifiers } from './play-keywords.ts';
import { inspectionCards, inspectionChooser } from './inspection.ts';
import { boundController } from './bindings.ts';
import { hasUpgradeWork, prioritizeUpgradeDefeat, resolveUpgradeDefeat } from './upgrade-defeat.ts';
import {
  finishPilotAttachment,
  attachablePilots,
  detachablePilots,
  attachPilot,
  detachPilot,
} from './pilot-conversion.ts';
import {
  commitTokenCreation,
  doubleTokenCreation,
  planTokenCreation,
  tokenReplacementSources,
} from './token-creation.ts';
import { searchAfterFrames } from './search.ts';
import { attackEffectOrigins } from './attack-grants.ts';
import { reconcilePrintedStats } from './printed-stats.ts';
import { abilityCostSource, actionUsage } from './abilities.ts';
import { repeatDefeatedAbility } from './triggers.ts';
import { resourceCard, changeResourceController } from './state.ts';
import { invokeDefeatedAbility, repeatAttackAbility } from './triggers.ts';
import { cannotPlayCard } from './play-restrictions.ts';
import { survivesZeroHp } from './lasting.ts';
import { combatAmount, inCombat, combatOrderIntents, type Attack } from './combat.ts';
import { planRandomCard, resolveRandomCard } from './random-card.ts';
import { assertRandomDiscard } from './random-discard.ts';
import { resolveAcceptedTrigger } from './triggers.ts';
import { chosenCardCost, paymentAbility } from './ability-payment.ts';
import { healingAmount, recordHealing } from './healing.ts';
import { matchingUpgrades } from './upgrade-selection.ts';
import { finishArrangeChoice, progressArrange } from './deck-order.ts';
import { discardCards, recordUnitEntry } from './phase-history.ts';
import { recordHandReveal } from './phase-history.ts';
import { emptyPhaseHistory } from './state.ts';
import { alternativePayments, takeCredit } from './credits.ts';
import { recordDraw } from './draw.ts';
import { triggerObservers } from './triggers.ts';
import { captureUnit, rescueCaptured } from './capture.ts';
import { applyHealing } from './benefits.ts';
import { resolvedDistributeEffectSchema } from './model.ts';
import { scheduleNextAction, collectActionEffects, collectDepartureEffects } from './delayed.ts';
import { applyUnitTax } from './unit-tax.ts';
import { grantedDiscardPlay } from './play-permissions.ts';
import { zoneSearchCards, zoneSearchOwner, finishZoneSearch } from './zone-search.ts';
import { zoneSearchEffectSchema } from './model.ts';
import { credits, defeatCredit, paymentAmount } from './credits.ts';
import { disclosePlayer, disclosureSatisfied } from './disclose.ts';
import { resolvedSearchEffectSchema, discloseEffectSchema } from './model.ts';
import { cardTitle } from '../cards/catalog.ts';
import { namedAbilityLoss } from './naming.ts';
import { inspectionOwner } from './inspection.ts';
import { offerPlot, plotPlay } from './plot.ts';
import { matchesCard } from './inspection.ts';
import { startingHandSize } from './state.ts';
import { triggerDefinitions } from './triggers.ts';
import { playActor } from './play-options.ts';
import { exchangeControl, changeControl } from './control.ts';
import { indirectFrame } from './indirect.ts';
import { effectCostSource } from './abilities.ts';
import { numericValue } from './values.ts';
import { isToken, isUpgrade } from './roles.ts';
import {
  simpleAbilitiesSchema,
  stateSchema,
  resolvedInspectionEffectSchema,
  unitFilterSchema,
} from './model.ts';
import { boundUnit, boundReference } from './bindings.ts';
import { conditionMatches } from './conditions.ts';
import { cannotReady, modifyUnit } from './lasting.ts';
import { matchingUnits, matchesUnit } from './targets.ts';
import { abilityOrigins, effectiveAbilities, supportOrigins } from './effective-abilities.ts';
import { deployCondition, hitPoints, payAbilityCosts, unitProfile } from './abilities.ts';
import {
  attach,
  canAttach,
  attachedUpgrades,
  defeatUpgrade,
  defeatUpgrades,
  isUnit,
  orphanUpgrades,
  unitStats,
  sourcePower,
} from './attachments.ts';
import {
  applyDamage,
  damagePreventionChoice,
  reservePrevention,
  damageIsUnpreventable,
} from './damage.ts';
import { cardTraits, unitIsLeader } from './attributes.ts';
import { captureDeparture } from './state.ts';
import { reattachmentTargets, captureObservers } from './attachments.ts';
import { exhaustibleLeaders } from './roles.ts';
import { canAffectWithAbility } from './protection.ts';
import { cardDefinition } from '../cards/catalog.ts';
import { IllegalInput, inputSchema } from './model.ts';
import type {
  AbilityOrigin,
  CardInstance,
  Decision,
  EngineInput,
  Fact,
  Frame,
  GameState,
  Intent,
} from './model.ts';
import { collectRegroupEffects, scheduleRegroup } from './delayed.ts';
import { finishSearch, randomBounds, searchOwner } from './search.ts';
import { actionIntents, frameIntents, decisionContext, frameSelection } from './actions.ts';
import {
  arenaSources,
  declaredTriggerObservers,
  abilitySources,
  collectTriggers,
  effectFrames,
  flushTriggers,
  resolveTrigger,
  uniqueConflict,
  sameIncarnation,
} from './triggers.ts';
import {
  allocateId,
  addCard,
  assertState,
  fact,
  initialState,
  instance,
  isArena,
  move,
  opponent,
  playCost,
  reference,
} from './state.ts';
import type { GameConfig } from './state.ts';

function sameSourceInPlay(state: GameState, source: CardInstance) {
  const current = state.cards[source.instanceId];
  return (
    current &&
    current.incarnation === source.incarnation &&
    ['base', 'ground', 'space'].includes(current.zone)
  );
}
function endGame(
  state: GameState,
  winner: string | null,
  reason: NonNullable<GameState['result']>['reason'],
  source?: CardInstance,
) {
  state.phase = 'ended';
  state.result = { winner, reason };
  state.attacks = [];
  state.delayedEffects = [];
  state.phaseTriggers = [];
  state.lastingEffects = [];
  state.namedEffects = [];
  state.playPayment = null;
  state.playModifiers = [];
  state.playRestrictions = [];
  state.grantedPlays = [];
  state.phaseStatModifiers = [];
  state.execution = { frames: [], pendingTriggers: [], decision: null, random: null };
  reconcilePrintedStats(state);
  fact(state, 'ended', winner, source ? [source] : []);
}

// V8 §§1.16.5, 5.6: base defeat is checked before unit defeat, after each
// simultaneous damage instance is fully applied. Both bases defeated is a draw.
function maintenance(
  state: GameState,
  combatDamaged: import('./model.ts').CardReference[] = [],
  sacrificed: CardInstance[] = [],
) {
  reconcilePrintedStats(state);
  const defeated = state.seats.filter(id => {
    const base = instance(state, state.players[id]!.base);
    return base.damage >= hitPoints(cardDefinition(state, base.cardId));
  });
  if (defeated.length) {
    endGame(state, defeated.length === 2 ? null : opponent(state, defeated[0]!), 'base-defeat');
    return;
  }
  if (hasUpgradeWork(state)) return;
  const conflict = uniqueConflict(state);
  if (conflict) {
    state.execution.frames.unshift({ kind: 'unique', ...conflict });
    return;
  }
  // V8 maintenance: unattached upgrades before lethal units; repeat after removals.
  defeatUpgrades(state, orphanUpgrades(state));
  if (hasUpgradeWork(state)) return;
  const lethal = [
    ...new Map(
      [
        ...sacrificed,
        ...arenaSources(state).filter(
          card => card.damage >= unitStats(state, card).hp && !survivesZeroHp(state, card),
        ),
      ].map(c => [c.instanceId, c]),
    ).values(),
  ];
  if (lethal.length) {
    defeatUnits(
      state,
      lethal,
      combatDamaged.filter(
        r =>
          !sacrificed.some(c => c.instanceId === r.instanceId && c.incarnation === r.incarnation),
      ),
    );
    maintenance(state, combatDamaged);
  }
}

function defeatUnits(
  state: GameState,
  cards: CardInstance[],
  combatDamaged: import('./model.ts').CardReference[] = [],
  source?: CardInstance,
  committed = false,
  prepared?: DefeatPreparation,
) {
  if (!committed) {
    cards = cards.filter(card => canAffectWithAbility(state, card, source, 'defeat'));
    if (deferUnitDefeat(state, cards, combatDamaged, source, prepared)) return cards;
  }
  const observers =
    prepared?.observers ??
    (cards.some(card => attachedUpgrades(state, card).length) ? captureObservers(state) : []);
  const leftObservers = declaredTriggerObservers(state, 'unit-left-play');
  const departures = new Map(
    prepared
      ? prepared.departures.map(d => [d.unit.reference.instanceId, d])
      : cards.map(card => [
          card.instanceId,
          captureDeparture(state, card, observers, leftObservers),
        ]),
  );
  for (const attack of state.attacks)
    for (const card of cards)
      if (
        !attack.defeated.some(
          r => r.instanceId === card.instanceId && r.incarnation === card.incarnation,
        )
      )
        attack.defeated.push(reference(card));
  const sources = abilitySources(state);
  state.phaseHistory.defeatedAttacking.push(
    ...cards
      .filter(card =>
        state.attacks.some(
          a =>
            a.attacker.instanceId === card.instanceId &&
            a.attacker.incarnation === card.incarnation &&
            !a.removedFromCombat.some(
              r => r.instanceId === card.instanceId && r.incarnation === card.incarnation,
            ),
        ),
      )
      .map(card => structuredClone(card)),
  );
  state.phaseHistory.defeated.push(
    ...cards.map(card => ({
      ...structuredClone(card),
      traits: [...departures.get(card.instanceId)!.unit.traits],
      leaderUnit: departures.get(card.instanceId)!.unit.leaderUnit,
    })),
  );
  // Every observer still sees the whole simultaneous defeat event, including
  // an observer that is itself defeated in this event (v8 §7.6.4).
  for (const card of cards) {
    const origins = departures.get(card.instanceId)!.unit.abilities;
    collectTriggers(state, 'bounty', [card], undefined, { origins });
    const batch = state.defeatedAbilityBatches.length;
    const defeatedTriggers = captureTriggers(state, 'defeated', [card], undefined, {
      origins,
      values: {
        'defeated-by-combat': Number(
          combatDamaged.some(
            r => r.instanceId === card.instanceId && r.incarnation === card.incarnation,
          ),
        ),
      },
    });
    state.defeatedAbilityBatches.push({
      unit: structuredClone(card),
      triggers: structuredClone(defeatedTriggers),
    });
    state.execution.pendingTriggers.push(...defeatedTriggers);
    if (prepared) {
      for (const observer of prepared.observers)
        collectTriggers(
          state,
          observer.source.controller === card.controller ? 'friendly-defeated' : 'enemy-defeated',
          [observer.source],
          card,
          { origins: observer.origins, values: { 'defeat-batch': batch } },
        );
    } else {
      collectTriggers(
        state,
        'enemy-defeated',
        sources.filter(source => source.controller !== card.controller),
        card,
      );
      collectTriggers(
        state,
        'friendly-defeated',
        sources.filter(source => source.controller === card.controller),
        card,
        { values: { 'defeat-batch': batch } },
      );
    }
  }
  // Resolve rescues after the whole simultaneous defeat, so a departing source
  // cannot grant an entry ability merely because its guard moved first.
  const rescued: CardInstance[] = [];
  for (const card of cards) {
    fact(state, 'defeated', card.controller, [card]);
    if (cardDefinition(state, card.cardId).kind === 'leader') {
      card.exhausted = true;
      move(state, card, 'base', departures.get(card.instanceId), rescued);
      card.deployedAs = null;
    } else move(state, card, 'discard', departures.get(card.instanceId), rescued);
    card.damage = 0;
  }
  for (const prisoner of rescued) rescueCaptured(state, prisoner);
  return cards;
}

function dealDamage(
  state: GameState,
  assignments: {
    target: CardInstance;
    amount: number;
    source?: CardInstance;
    unpreventable?: boolean;
    excess?: { target: ReturnType<typeof reference>; amount: number };
    excessRoute?: Extract<Frame, { kind: 'damage' }>['assignments'][number]['excessRoute'];
  }[],
  actor: string | null,
  source?: CardInstance,
  combatAttackId?: string,
  after?: Extract<Frame, { kind: 'damage' }>['after'],
) {
  if (!assignments.length) {
    if (after)
      state.execution.frames.unshift(
        ...effectFrames(after.playerId, after.source, after.effects, {
          ...after,
          values: {
            ...after.values,
            'base-damage': 0,
            'damage-dealt': 0,
            'friendly-units-damaged': 0,
          },
        }),
      );
    return;
  }
  state.execution.frames.unshift({
    kind: 'damage',
    ...(after ? { after } : {}),
    ...(combatAttackId ? { combatAttackId } : {}),
    actor,
    assignments: assignments.map(assignment => ({
      target: reference(assignment.target),
      amount: assignment.amount,
      source: structuredClone(assignment.source ?? source ?? null),
      preventedBy: null,
      ...(assignment.unpreventable || damageIsUnpreventable(state, assignment.source ?? source)
        ? { unpreventable: true }
        : {}),
      ...(assignment.excess ? { excess: assignment.excess } : {}),
      ...(assignment.excessRoute ? { excessRoute: assignment.excessRoute } : {}),
    })),
  });
}

function draw(state: GameState, players: string[], amount: number) {
  const missing: { target: CardInstance; amount: number }[] = [];
  for (const id of players) {
    const player = state.players[id]!;
    const drawn = player.deck.slice(0, amount).map(card => instance(state, card));
    for (const card of drawn) move(state, card, 'hand');
    recordDraw(state, id, drawn);
    missing.push({ target: instance(state, player.base), amount: (amount - drawn.length) * 3 });
  }
  dealDamage(state, missing, null);
}

function attackingAssignments(state: GameState, attack: Attack) {
  const attacker = instance(state, attack.attacker.instanceId),
    defender = instance(state, attack.defender.instanceId);
  const power = combatAmount(state, attack, attacker);
  const overwhelm = effectiveAbilities(state, attacker).keywords?.includes('Overwhelm');
  const base = instance(state, state.players[attack.defendingPlayer]!.base);
  const missing =
    defender.incarnation !== attack.defender.incarnation ||
    attack.removedFromCombat.some(
      r => r.instanceId === defender.instanceId && r.incarnation === attack.defender.incarnation,
    ) ||
    !(isUnit(state, defender) || cardDefinition(state, defender.cardId).kind === 'base');
  const route = attack.excessToUnit
    ? { ...attack.excessToUnit, overwhelm: !!overwhelm }
    : undefined;
  if (missing)
    return overwhelm || route
      ? [
          {
            target: base,
            amount: power,
            source: attacker,
            ...(route && power > 0 ? { excessRoute: { ...route, whole: true } } : {}),
          },
        ]
      : [];
  const excess =
    (overwhelm || route) && isUnit(state, defender) && !survivesZeroHp(state, defender)
      ? Math.max(0, power - (unitStats(state, defender).hp - defender.damage))
      : 0;
  return [
    {
      target: defender,
      amount: route ? power : power - excess,
      source: attacker,
      ...(excess && !route ? { excess: { target: reference(base), amount: excess } } : {}),
      ...(isUnit(state, defender) && route && power > 0
        ? { excessRoute: { ...route, whole: false } }
        : {}),
    },
  ];
}

function beginAttack(
  state: GameState,
  attacker: CardInstance,
  defender: CardInstance,
  actor: string,
  powerBonus = 0,
  grantedAbilities: AbilityOrigin[] = [],
  attackerFirst = false,
  ambush = false,
  rules: {
    preventDamage?: boolean;
    redirectExcess?: boolean;
    blankDefender?: boolean;
    defenderPowerModifier?: number;
    damageStat?: 'remaining-hp';
    source?: CardInstance;
    after?: Attack['after'];
  } = {},
) {
  const attack: Attack = {
    baseDamageSources: [],
    ...(rules.redirectExcess && isUnit(state, defender)
      ? {
          excessToUnit: {
            source: structuredClone(rules.source!),
            arena: defender.zone as 'ground' | 'space',
          },
        }
      : {}),
    ...(rules.damageStat ? { damageStat: rules.damageStat } : {}),
    ...(rules.after ? { after: structuredClone(rules.after) } : {}),
    ambush,
    id: allocateId(state, 'a'),
    attackerFirst,
    attacker: reference(attacker),
    defender: reference(defender),
    defendingPlayer: defender.controller,
    removedFromCombat: [],
    powerBonus,
    grantedAbilities,
    combatDamage: [],
    defeated: [],
  };
  state.attacks.push(attack);
  state.actionHistory?.attacks.push(reference(attacker));
  state.phaseHistory.attacks.push({
    leaderUnit: unitIsLeader(state, attacker),
    ...structuredClone(attacker),
    traits: [...cardTraits(state, attacker)],
  });
  attacker.exhausted = true;
  fact(state, 'attacked', actor, [attacker, defender]);
  if (rules.blankDefender && isUnit(state, defender))
    modifyUnit(state, rules.source ?? attacker, defender, {
      kind: 'modify',
      power: 0,
      hp: 0,
      duration: 'attack',
      loseAbilities: true,
    });
  if (rules.preventDamage)
    modifyUnit(state, rules.source ?? attacker, attacker, {
      kind: 'modify',
      power: 0,
      hp: 0,
      duration: 'attack',
      preventAllDamage: true,
    });
  const context = {
    bindings: { attacker: reference(attacker), defender: reference(defender) },
    values: { 'attacking-seat': state.seats.indexOf(actor) },
  };
  if (rules.defenderPowerModifier && isUnit(state, defender))
    modifyUnit(state, rules.source ?? attacker, defender, {
      kind: 'modify',
      power: rules.defenderPowerModifier,
      hp: 0,
      duration: 'attack',
    });
  if (cardDefinition(state, defender.cardId).kind === 'base') {
    state.actionHistory?.basesAttacked.push(defender.controller);
    if (!state.phaseHistory.basesAttacked.includes(defender.controller))
      state.phaseHistory.basesAttacked.push(defender.controller);
    collectTriggers(
      state,
      'own-base-attacked',
      abilitySources(state).filter(c => c.controller === defender.controller),
      attacker,
      context,
    );
  }
  collectTriggers(state, 'attack', [attacker], undefined, context);
  collectTriggers(state, 'attacked', [defender], undefined, context);
  if (isUnit(state, defender))
    collectTriggers(state, 'host-attacked', attachedUpgrades(state, defender), defender, context);
  collectTriggers(
    state,
    'friendly-attack',
    abilitySources(state).filter(c => c.controller === actor),
    attacker,
  );
  state.execution.frames.unshift(
    { kind: 'flush-triggers' },
    { kind: 'combat', attackId: attack.id },
    { kind: 'end-attack', attackId: attack.id },
    { kind: 'flush-triggers' },
  );
  maintenance(state);
}

function playFromZone(
  state: GameState,
  actor: string,
  intent: Extract<Intent, { kind: 'play' }>,
  discount = 0,
  ready = false,
  from: 'hand' | 'discard' | 'deck' | 'resources' = 'hand',
  free = false,
  replaceResource = false,
  credit = 0,
  ignoreOneColoredPenalty = false,
  takeControl = false,
  phaseAbilities?: import('../cards/definition.ts').SimpleAbilities,
  grantSource?: CardInstance,
  phaseDamagePrevention?: number,
  normalAction = false,
  ignoreAspectPenalties = false,
  authorizedDeckCard?: import('./model.ts').CardReference,
  using?: 'plot' | 'smuggle',
  costPhaseAbilities?: import('../cards/definition.ts').SimpleAbilities,
  unitPayment = 0,
): CardInstance {
  const card = instance(state, intent.card),
    definition = cardDefinition(state, card.cardId);
  if (intent.smuggle) {
    if (intent.piloting || (using && using !== 'smuggle')) throw new IllegalInput();
    using = 'smuggle';
  }
  if (using === 'smuggle' && (!intent.smuggle || from !== 'resources' || !replaceResource))
    throw new IllegalInput();
  if (definition.kind !== 'unit' && definition.kind !== 'upgrade' && definition.kind !== 'event')
    throw new IllegalInput();
  const granted = from === 'discard' && grantedDiscardPlay(state, card, actor);
  if (
    granted &&
    (free !== granted.free ||
      ignoreAspectPenalties !== granted.ignoreAspectPenalties ||
      (granted.free && !!intent.piloting))
  )
    throw new IllegalInput();
  if (
    (!state.playPayment && cannotPlayCard(state, card, actor, normalAction)) ||
    (intent.piloting && namedAbilityLoss(state, card)) ||
    card.zone !== from ||
    (card.controller !== actor && !granted && !takeControl) ||
    (takeControl && (!free || (from !== 'resources' && from !== 'deck'))) ||
    (from === 'deck' &&
      !state.searching.includes(card.instanceId) &&
      !(
        authorizedDeckCard &&
        authorizedDeckCard.instanceId === card.instanceId &&
        authorizedDeckCard.cardId === card.cardId &&
        authorizedDeckCard.incarnation === card.incarnation &&
        authorizedDeckCard.visibility === card.visibility
      ))
  )
    throw new IllegalInput();
  if (takeControl) {
    if (from === 'resources') changeResourceController(state, card, actor);
    else card.controller = actor;
  }
  if (granted) card.controller = actor;
  if (replaceResource && from !== 'resources') throw new IllegalInput();
  if (using === 'plot' && (from !== 'resources' || !replaceResource)) throw new IllegalInput();
  if (intent.plotPayment && using !== 'plot') throw new IllegalInput();
  const replacement = replaceResource ? state.players[actor]!.deck[0] : undefined;
  const prepared = state.playPayment;
  const originalCost = prepared
    ? prepared.remaining
    : free
      ? 0
      : playCost(
          state,
          card,
          discount,
          intent.piloting,
          intent.target ? instance(state, intent.target) : undefined,
          ignoreOneColoredPenalty,
          ignoreAspectPenalties,
          using,
          intent.smuggle,
          costPhaseAbilities,
        );
  const cost = Math.max(0, resourcePayment(state, actor, originalCost) - credit - unitPayment);
  const readyResources = state.players[actor]!.resources.map(id => instance(state, id)).filter(
    c => !c.exhausted && !(intent.plotPayment && c.instanceId === card.instanceId),
  );
  // Plot replaces its source with an exhausted resource. Use that source first
  // by default; the explicit alternative excludes it without increasing the cost.
  if (using === 'plot' && !intent.plotPayment)
    readyResources.sort(
      (a, b) => Number(b.instanceId === card.instanceId) - Number(a.instanceId === card.instanceId),
    );
  const resources = readyResources.slice(0, cost);
  if (resources.length !== cost) throw new IllegalInput();
  for (const resource of resources) resource.exhausted = true;
  const asUnit = definition.kind === 'unit' && !intent.piloting;
  const modifiers = prepared
    ? state.playModifiers.filter(m => prepared.modifiers.includes(m.id))
    : matchingPlayModifiers(state, card, asUnit, using);
  state.playPayment = null;
  state.playModifiers = state.playModifiers.filter(m => m.phaseCost || !modifiers.includes(m));
  ready ||= asUnit && modifiers.some(m => m.ready);
  state.roundHistory.plays.push({
    ...(intent.target ? { host: structuredClone(instance(state, intent.target)) } : {}),
    card: structuredClone(card),
    asUnit,
    whenDefeated:
      asUnit &&
      triggerDefinitions(state, card, abilityOrigins(state, card)).some(
        t => t.timing === 'defeated',
      ),
  });
  if (definition.kind === 'event') {
    // V8 §7.4: events never enter play; their ability resolves from discard.
    if (card.zone === 'discard') {
      // V8 §§3.3.7, 4.7.5: an event replayed from discard re-enters as a new copy.
      card.incarnation++;
      state.grantedPlays = state.grantedPlays.filter(p => p.target.instanceId !== card.instanceId);
    }
    move(state, card, 'discard');
    card.controller = card.owner;
    const playedSource = { ...card, controller: actor };
    if (!namedAbilityLoss(state, playedSource))
      state.execution.frames.unshift(...effectFrames(actor, playedSource, definition.effects));
  } else if (definition.kind === 'upgrade' || intent.piloting) {
    if (!intent.target || (definition.kind === 'upgrade' && definition.token))
      throw new IllegalInput();
    attach(state, card, instance(state, intent.target), !replaceResource);
  } else {
    const entersReady =
      !namedAbilityLoss(state, card) &&
      definition.entersReady &&
      conditionMatches(state, actor, definition.entersReady, { source: card });
    move(state, card, definition.arena);
    card.exhausted = !(ready || entersReady);
  }
  if (replacement) {
    const resource = instance(state, replacement);
    move(state, resource, 'resources');
    resource.exhausted = true;
    fact(state, 'resourced', actor, [], 1);
    fact(state, 'resourced', actor, [resource], 1, [actor]);
  }
  if (replaceResource && card.attachedTo) {
    const host = instance(state, card.attachedTo.instanceId);
    collectTriggers(state, 'upgrades-attached', [host]);
    if (cardTraits(state, card).includes('Pilot'))
      collectTriggers(state, 'pilot-attached', [host], card);
  }
  state.phaseHistory.played.push({
    ...(card.attachedTo
      ? { host: structuredClone(instance(state, card.attachedTo.instanceId)) }
      : {}),
    playerId: actor,
    card: { ...structuredClone(card), controller: actor },
    traits: [...cardTraits(state, card)],
  });
  for (const modifier of modifiers)
    if (modifier.phaseAbilities && (isUnit(state, card) || isUpgrade(state, card)))
      modifyUnit(state, modifier.source, card, {
        kind: 'modify',
        power: 0,
        hp: 0,
        duration: 'phase',
        abilities: modifier.phaseAbilities,
      });
  if (phaseAbilities && (isUnit(state, card) || isUpgrade(state, card)))
    modifyUnit(state, grantSource ?? card, card, {
      kind: 'modify',
      power: 0,
      hp: 0,
      abilities: phaseAbilities,
      duration: 'phase',
    });
  if (phaseDamagePrevention && isUnit(state, card))
    modifyUnit(state, grantSource ?? card, card, {
      kind: 'modify',
      power: 0,
      hp: 0,
      duration: 'phase',
      preventNextDamage: phaseDamagePrevention,
    });
  card.resourcesPaid = cost + unitPayment;
  recordUnitEntry(state, card);
  fact(state, 'played', actor, [card], cost + unitPayment);
  collectTriggers(
    state,
    'played',
    [card],
    undefined,
    using === 'smuggle' ? { values: { 'played-using-smuggle': 1 } } : undefined,
  );
  collectTriggers(
    state,
    'friendly-card-played',
    abilitySources(state).filter(c => c.controller === actor),
    { ...card, controller: actor },
    {
      values: {
        'played-from-resources': from === 'resources' ? 1 : 0,
        ...(using === 'smuggle' ? { 'played-using-smuggle': 1 } : {}),
      },
    },
  );
  collectTriggers(
    state,
    'enemy-card-played',
    abilitySources(state).filter(c => c.controller !== actor),
    { ...card, controller: actor },
  );
  if (card.attachedTo && card.controller === instance(state, card.attachedTo.instanceId).controller)
    collectTriggers(
      state,
      'upgrade-played-on-self',
      [instance(state, card.attachedTo.instanceId)],
      card,
    );
  if (isUnit(state, card))
    collectTriggers(
      state,
      'friendly-played',
      abilitySources(state).filter(c => c.controller === actor),
      card,
    );
  maintenance(state);
  return card;
}
function applyCardCosts(
  state: GameState,
  source: CardInstance,
  costs: import('../cards/definition.ts').ActionDefinition['costs'],
  selections: string[],
) {
  for (const cost of costs) {
    const cards = selections.map(id => instance(state, id));
    if (cost.kind === 'damage-own-base')
      dealDamage(
        state,
        [{ target: instance(state, state.players[source.controller]!.base), amount: cost.amount }],
        source.controller,
        source,
      );
    if (cost.kind === 'exhaust-friendly-unit')
      for (const card of cards) {
        card.exhausted = true;
        fact(state, 'exhausted', source.controller, [source, card]);
      }
    if (cost.kind === 'ready-enemy-unit')
      for (const card of cards) {
        readyInPlay(state, [card]);
        fact(state, 'readied', source.controller, [source, card]);
      }
    if (cost.kind === 'defeat-friendly-upgrade') defeatUpgrades(state, cards, source);
    if (cost.kind === 'discard-hand') discardCards(state, cards, source.controller, source);
    if (cost.kind === 'discard-deck')
      discardCards(
        state,
        state.players[source.controller]!.deck.slice(0, cost.count).map(id => instance(state, id)),
        source.controller,
        source,
      );
    if (cost.kind === 'defeat-resource')
      for (const card of cards) {
        fact(state, 'defeated', source.controller, [source, card]);
        move(state, card, 'discard');
      }
    if (cost.kind === 'return-friendly-unit')
      for (const card of cards) {
        if (unitIsLeader(state, card)) defeatUnits(state, [card]);
        else {
          fact(
            state,
            isToken(cardDefinition(state, card.cardId)) ? 'left-play' : 'returned-to-hand',
            source.controller,
            [source, card],
          );
          move(state, card, 'hand');
          card.damage = 0;
        }
      }
    if (cost.kind === 'defeat-friendly-token' || cost.kind === 'defeat-friendly-credit')
      for (const card of cards) {
        if (isUnit(state, card)) defeatUnits(state, [card]);
        else if (isUpgrade(state, card)) defeatUpgrade(state, card);
        else {
          fact(state, 'defeated', source.controller, [source, card]);
          move(state, card, 'set-aside');
        }
      }
  }
  maintenance(state);
}

function applyEffect(
  state: GameState,
  frame: Extract<Frame, { kind: 'effect' }>,
  intent?: Intent,
  selections: string[] = [],
  credit = 0,
  costSelections: string[] = [],
  unitPayment = 0,
) {
  const { effect, playerId, source } = frame;
  if (intent?.kind === 'decline-effect') {
    if (
      (effect.kind === 'select-unit' || effect.kind === 'play-card' || effect.kind === 'pay') &&
      effect.otherwise
    )
      state.execution.frames.unshift(...effectFrames(playerId, source, effect.otherwise, frame));
    return;
  }
  const target = intent?.kind === 'target' ? instance(state, intent.card) : null;
  switch (effect.kind) {
    case 'schedule-resource-repayment': {
      const amount = numericValue(state, frame, effect.amount);
      if (amount > 0) {
        state.delayedEffects.push({
          id: allocateId(state, 'l'),
          kind: effect.at === 'regroup' ? 'resources-at-regroup' : 'resources-at-action',
          playerId,
          source: structuredClone(source),
          target: null,
          dueRound:
            effect.at === 'next-action' || state.phase === 'regroup'
              ? state.round + 1
              : state.round,
          amount,
          ...(frame.origin ? { origin: frame.origin } : {}),
        });
        fact(state, 'delayed-scheduled', playerId, [source], amount);
      }
      break;
    }
    case 'resource-cards': {
      const cards = (frame.groups?.[effect.group] ?? []).flatMap(ref => {
        const card = state.cards[ref.instanceId];
        return card &&
          card.incarnation === ref.incarnation &&
          card.visibility === ref.visibility &&
          card.zone === 'hand' &&
          card.owner === playerId
          ? [card]
          : [];
      });
      for (const card of cards) resourceCard(state, card, playerId, effect.ready);
      if (cards.length) {
        fact(state, 'resourced', playerId, [], cards.length);
        fact(state, 'resourced', playerId, cards, cards.length, [playerId]);
      }
      state.execution.frames.unshift(
        ...effectFrames(playerId, source, effect.effects, {
          ...frame,
          values: { ...frame.values, [effect.countAs]: cards.length },
        }),
      );
      break;
    }

    case 'take-control-upgrade': {
      const upgrade = boundUnit(state, frame, effect.target);
      const recipient =
        effect.player === 'attacker'
          ? state.seats[frame.values?.['attacking-seat'] ?? -1]
          : playerId;
      if (upgrade && isUpgrade(state, upgrade) && recipient && upgrade.controller !== recipient) {
        if (cardDefinition(state, upgrade.cardId).kind === 'leader') {
          defeatUpgrade(state, upgrade);
          maintenance(state);
          break;
        }
        upgrade.controller = recipient;
        fact(state, 'control-changed', recipient, [upgrade]);
      }
      break;
    }
    case 'attach-self': {
      const self = boundUnit(state, frame, 'source');
      if (
        self &&
        isUnit(state, self) &&
        target &&
        target.instanceId !== self.instanceId &&
        matchesUnit(state, target, playerId, effect.filter, frame)
      ) {
        if (effect.effects)
          state.execution.frames.unshift(
            ...effectFrames(playerId, source, effect.effects, {
              ...frame,
              bindings: { ...frame.bindings, 'attached-host': reference(target) },
            }),
          );
        attachPilot(state, self, target, source, effect.filter);
        maintenance(state);
      }
      break;
    }
    case 'attach-pilot': {
      const host = boundUnit(state, frame, effect.host);
      if (host && target && attachablePilots(state, playerId, host).includes(target)) {
        if (attachPilot(state, target, host, source)) maintenance(state);
      }
      break;
    }
    case 'detach-pilot':
      if (target && detachablePilots(state).includes(target)) {
        detachPilot(state, target, source);
        maintenance(state);
      }
      break;
    case 'flip-leader': {
      const leader = sameIncarnation(state, source);
      const definition = leader && cardDefinition(state, leader.cardId);
      if (
        leader &&
        definition?.kind === 'leader' &&
        definition.faces.alternate &&
        leader.zone === 'base' &&
        leader.deployedAs === null
      ) {
        const before = reference(leader);
        leader.incarnation++;
        if (leader.leaderSide) delete leader.leaderSide;
        else leader.leaderSide = 'back';
        fact(state, 'leader-flipped', playerId, [before, leader]);
        maintenance(state);
      }
      break;
    }
    case 'attach-leader': {
      const leader = sameIncarnation(state, source);
      if (
        leader &&
        cardDefinition(state, leader.cardId).kind === 'leader' &&
        leader.zone === 'base' &&
        leader.deployedAs === null &&
        target &&
        canAttach(state, leader, target)
      ) {
        leader.deployedAs = 'upgrade';
        attach(state, leader, target);
        recordUnitEntry(state, leader);
        maintenance(state);
      }
      break;
    }
    case 'draw-card': {
      const card = boundUnit(state, frame, effect.target);
      if (card?.zone === 'deck') {
        const owner = card.owner;
        move(state, card, 'hand');
        recordDraw(state, owner, [card]);
      }
      break;
    }
    case 'reattach-upgrade': {
      const upgrade = boundUnit(state, frame, effect.target);
      if (
        upgrade &&
        isUpgrade(state, upgrade) &&
        target &&
        reattachmentTargets(state, upgrade).includes(target) &&
        (!effect.filter ||
          matchesUnit(
            state,
            target,
            effect.chooser === 'controller' ? upgrade.controller : playerId,
            effect.filter,
            frame,
          ))
      ) {
        attach(state, upgrade, target);
        maintenance(state);
      }
      break;
    }
    case 'exhaust-leader':
      if (target && exhaustibleLeaders(state, playerId).includes(target)) {
        target.exhausted = true;
        fact(state, 'exhausted', playerId, [source, target]);
        state.execution.frames.unshift(...effectFrames(playerId, source, effect.effects, frame));
      }
      break;
    case 'damage-chosen-bases':
      dealDamage(
        state,
        selections.map(id => ({ target: instance(state, id), amount: effect.amount })),
        playerId,
        source,
      );
      break;
    case 'create-credits': {
      const recipient = effect.player === 'enemy' ? opponent(state, playerId) : playerId;
      state.execution.frames.unshift(
        planTokenCreation(
          frame,
          {
            kind: 'credits',
            recipient,
            count: Math.max(0, numericValue(state, frame, effect.amount)),
          },
          { creator: recipient },
        ),
      );
      break;
    }
    case 'take-enemy-credit':
      if (target) takeCredit(state, target, playerId, source);
      break;
    case 'defeat-credit':
      if (target && credits(state, playerId, effect.controller).includes(target)) {
        defeatCredit(state, target, playerId);
        state.execution.frames.unshift(...effectFrames(playerId, source, effect.effects, frame));
      }
      break;
    case 'disclose': {
      const chooser = disclosePlayer(state, playerId, effect, frame);
      if (chooser)
        state.execution.frames.unshift({
          kind: 'disclose',
          playerId,
          source: structuredClone(source),
          chooser,
          effect: discloseEffectSchema.parse(effect),
          ...(frame.bindings ? { bindings: frame.bindings } : {}),
          ...(frame.groups ? { groups: frame.groups } : {}),
          ...(frame.values ? { values: frame.values } : {}),
          ...(frame.names ? { names: frame.names } : {}),
        });
      break;
    }
    case 'restrict-play':
      if (state.phase === 'action' || state.phase === 'regroup')
        state.playRestrictions.push({
          id: allocateId(state, 'p'),
          source: structuredClone(source),
          playerId: effect.player === 'enemy' ? opponent(state, playerId) : playerId,
          filter: structuredClone(effect.filter),
          round: state.round,
          phase: state.phase,
        });
      break;
    case 'plot-play':
      applyEffect(
        state,
        { ...frame, effect: plotPlay },
        intent,
        selections,
        credit,
        costSelections,
        unitPayment,
      );
      break;
    case 'grant-keyword-until-source-leaves':
      state.keywordGrants.push({
        id: allocateId(state, 'k'),
        source: structuredClone(source),
        playerId,
        trait: effect.trait,
        abilities: simpleAbilitiesSchema.parse(effect.abilities),
      });
      break;
    case 'phase-play-cost':
      if (state.phase === 'action' || state.phase === 'regroup')
        state.playModifiers.push({
          id: allocateId(state, 'p'),
          source: structuredClone(source),
          playerId: effect.player === 'enemy' ? opponent(state, playerId) : playerId,
          filter: structuredClone(effect.filter),
          discount: 0,
          ready: false,
          phaseCost: { increase: effect.increase, recipient: effect.player },
          round: state.round,
          phase: state.phase,
        });
      break;
    case 'next-play':
      if (state.phase === 'action' || state.phase === 'regroup')
        state.playModifiers.push({
          id: allocateId(state, 'p'),
          source: structuredClone(source),
          playerId,
          filter: structuredClone(effect.filter),
          discount: numericValue(state, frame, effect.discount ?? 0),
          ...(frame.values?.['bounty-context'] !== undefined
            ? { bounty: frame.values['bounty-context'] }
            : {}),
          ...(effect.discountIfSharesKeyword ? { discountIfSharesKeyword: true } : {}),
          ...(effect.using ? { using: effect.using } : {}),
          ready: effect.ready ?? false,
          ...(effect.phaseAbilities
            ? { phaseAbilities: simpleAbilitiesSchema.parse(effect.phaseAbilities) }
            : {}),
          round: state.round,
          phase: state.phase,
        });
      break;
    case 'play-card':
      if (intent?.kind === 'play') {
        const playedHost = intent.target ? reference(instance(state, intent.target)) : undefined;
        if (effect.repeat) state.execution.frames.unshift(structuredClone(frame));
        else if (effect.group) {
          const remaining = (frame.groups?.[effect.group] ?? []).filter(
            ref => ref.instanceId !== intent.card,
          );
          if (remaining.length)
            state.execution.frames.unshift({
              ...frame,
              groups: { ...frame.groups, [effect.group]: remaining },
            });
        }
        state.execution.frames.unshift({ kind: 'flush-triggers' });
        const before = state.execution.frames.length;
        const card = playFromZone(
          state,
          playActor(state, playerId, effect, frame),
          intent,
          numericValue(state, frame, effect.discount ?? 0),
          effect.ready ?? false,
          effect.from,
          effect.free,
          effect.replaceResource || effect.using === 'smuggle',
          credit,
          effect.ignoreOneColoredPenalty,
          effect.takeControl,
          effect.phaseAbilities ?? (credit > 0 ? effect.phaseAbilitiesWithCredit : undefined),
          source,
          effect.phaseDamagePrevention,
          false,
          effect.ignoreAspectPenalties,
          effect.from === 'deck'
            ? effect.target
              ? boundReference(frame, effect.target, state)
              : effect.group
                ? frame.groups?.[effect.group]?.find(ref => ref.instanceId === intent.card)
                : undefined
            : undefined,
          effect.using,
          effect.phaseAbilities,
          unitPayment,
        );
        if (!state.result && effect.beforePlayed)
          state.execution.frames.unshift(
            ...effectFrames(playerId, source, effect.beforePlayed, frame),
          );
        if (!state.result)
          state.execution.frames.splice(
            state.execution.frames.length - before,
            0,
            ...effectFrames(playerId, source, effect.effects ?? [], {
              ...frame,
              bindings: {
                ...frame.bindings,
                ...(effect.bind ? { [effect.bind]: reference(card) } : {}),
                ...(effect.bindHost && playedHost ? { [effect.bindHost]: playedHost } : {}),
              },
            }),
          );
      }
      break;
    case 'distribute': {
      state.execution.frames.unshift({
        kind: 'allocate-benefit',
        playerId,
        source,
        effect: resolvedDistributeEffectSchema.parse({
          ...effect,
          amount: Math.max(0, numericValue(state, frame, effect.amount)),
        }),
        ...(frame.bindings ? { bindings: frame.bindings } : {}),
        ...(frame.groups ? { groups: frame.groups } : {}),
        ...(frame.values ? { values: frame.values } : {}),
        ...(frame.names ? { names: frame.names } : {}),
      });
      break;
    }
    case 'schedule-return': {
      const unit = boundUnit(state, frame, effect.target);
      if (unit && isUnit(state, unit))
        scheduleRegroup(state, playerId, source, unit, 'return-at-regroup');
      break;
    }
    case 'grant-discard-play': {
      const ref = boundReference(frame, effect.target, state),
        card = ref && state.cards[ref.instanceId];
      if (
        card &&
        card.zone === 'discard' &&
        card.incarnation === ref!.incarnation &&
        card.visibility === ref!.visibility &&
        ['unit', 'event', 'upgrade'].includes(cardDefinition(state, card.cardId).kind) &&
        (state.phase === 'action' || state.phase === 'regroup')
      )
        state.grantedPlays.push({
          scope: effect.target === 'source' ? 'source' : 'bound-card',
          recipient: effect.player,
          free: effect.free ?? true,
          ignoreAspectPenalties: effect.ignoreAspectPenalties ?? false,
          source: structuredClone(source),
          target: reference(card),
          playerId: effect.player === 'enemy' ? opponent(state, playerId) : playerId,
          round: state.round,
          phase: state.phase,
        });
      break;
    }
    case 'search-zones': {
      const owner = zoneSearchOwner(state, playerId, effect, frame);
      if (!owner) break;
      const cards = zoneSearchCards(state, owner, effect);
      fact(state, 'searched', playerId, [source], cards.length);
      if (cards.length) fact(state, 'looked-at', playerId, cards, cards.length, [playerId]);
      state.execution.frames.unshift({
        kind: 'zone-search',
        playerId,
        source,
        owner,
        cards,
        effect: zoneSearchEffectSchema.parse(effect),
        ...(frame.bindings ? { bindings: frame.bindings } : {}),
        ...(frame.groups ? { groups: frame.groups } : {}),
        ...(frame.values ? { values: frame.values } : {}),
        ...(frame.names ? { names: frame.names } : {}),
      });
      break;
    }
    case 'inspect-zone': {
      const owner = inspectionOwner(state, playerId, effect, frame);
      if (!owner) break;
      const chooser = inspectionChooser(state, playerId, owner, effect);
      const cards = inspectionCards(state, owner, effect, frame);
      if (effect.reveal && cards.length) {
        fact(state, 'revealed', playerId, cards);
        if (effect.zone === 'hand') recordHandReveal(state, cards);
      }
      if (
        !effect.reveal &&
        (effect.zone === 'deck' ||
          ((effect.zone === 'hand' || effect.zone === 'resources') && owner !== chooser))
      )
        fact(state, 'looked-at', chooser, cards, cards.length, [chooser]);
      state.execution.frames.unshift({
        kind: 'zone-inspection',
        playerId,
        source: structuredClone(source),
        owner,
        chooser,
        cards,
        effect: resolvedInspectionEffectSchema.parse({
          ...effect,
          min: numericValue(state, frame, effect.min),
          max: numericValue(state, frame, effect.max),
        }),
        ...(frame.bindings ? { bindings: frame.bindings } : {}),
        ...(frame.groups ? { groups: frame.groups } : {}),
        ...(frame.values ? { values: frame.values } : {}),
        ...(frame.names ? { names: frame.names } : {}),
      });
      break;
    }
    case 'move-cards': {
      const cards = (frame.groups?.[effect.group] ?? []).flatMap(ref => {
        const card = state.cards[ref.instanceId];
        return card &&
          card.incarnation === ref.incarnation &&
          card.zone === effect.from &&
          matchesCard(state, card, effect.filter ?? {}, frame)
          ? [card]
          : [];
      });
      if (effect.to === 'discard') {
        const discarder = (card: CardInstance) =>
          effect.discardBy === 'owner'
            ? card.owner
            : effect.discardBy === 'enemy'
              ? opponent(state, playerId)
              : playerId;
        for (const actor of new Set(cards.map(discarder)))
          discardCards(
            state,
            cards.filter(c => discarder(c) === actor),
            actor,
            source,
          );
      } else {
        for (const card of cards) move(state, card, 'hand');
        if (cards.length) {
          if (effect.from === 'resources') {
            fact(state, 'returned-to-hand', playerId, [source], cards.length);
            for (const owner of new Set(cards.map(c => c.owner)))
              fact(
                state,
                'returned-to-hand',
                playerId,
                [source, ...cards.filter(c => c.owner === owner)],
                cards.filter(c => c.owner === owner).length,
                [...new Set([playerId, owner])],
              );
          } else fact(state, 'returned-to-hand', playerId, [source, ...cards]);
        }
      }
      break;
    }
    case 'repeat-bounty':
      repeatBounty(state, playerId, frame.values?.[effect.index]);
      break;
    case 'schedule-phase-trigger':
      schedulePhaseTrigger(state, frame);
      break;
    case 'repeat-played-ability':
      repeatPlayedAbility(state, playerId, frame.values?.[effect.index]);
      break;
    case 'repeat-attack-ability':
      repeatAttackAbility(state, playerId, frame.values?.[effect.index]);
      break;
    case 'repeat-defeated-batch': {
      const batch = state.defeatedAbilityBatches[frame.values?.[effect.index] ?? -1];
      const subject = boundReference(frame, 'subject', state);
      if (
        !batch ||
        batch.unit.controller !== playerId ||
        batch.unit.instanceId !== subject?.instanceId ||
        batch.unit.incarnation !== subject.incarnation
      )
        throw Error('Invalid repeated defeat group');
      const triggers = batch.triggers
        .filter(t => triggerAvailable(state, t))
        .map(t => ({ ...structuredClone(t), id: allocateId(state, 't') }));
      if (triggers.length)
        state.execution.frames.unshift({ kind: 'trigger-batch', playerId, triggers });
      break;
    }
    case 'repeat-defeated-ability':
      repeatDefeatedAbility(state, playerId, frame.values?.[effect.index]);
      break;
    case 'use-played-abilities': {
      const triggers = matchingUnits(state, playerId, effect.filter, frame).flatMap(unit => {
        const origins = abilityOrigins(state, unit);
        return (abilitiesFrom(state, origins).triggers ?? [])
          .filter(a => a.timing === 'played')
          .map(a => ({
            id: allocateId(state, 't'),
            playerId,
            source: structuredClone(unit),
            abilityId: a.id,
            abilities: structuredClone(origins),
          }))
          .filter(t => triggerAvailable(state, t));
      });
      if (triggers.length)
        state.execution.frames.unshift({
          kind: 'trigger-batch',
          playerId,
          triggers,
          chooseAny: true,
        });
      break;
    }
    case 'use-defeated-ability': {
      const unit = boundUnit(state, frame, effect.target);
      if (unit) invokeDefeatedAbility(state, unit);
      break;
    }
    case 'schedule-regroup-victory': {
      state.delayedEffects.push({
        id: allocateId(state, 'l'),
        kind: 'victory-at-regroup',
        playerId,
        source: structuredClone(source),
        target: null,
        dueRound: state.round,
        arena: effect.arena,
      });
      fact(state, 'delayed-scheduled', playerId, [source]);
      break;
    }
    case 'extra-action': {
      const finish = state.execution.frames.find(
        f => f.kind === 'finish-action' && f.playerId === playerId,
      );
      if (finish?.kind === 'finish-action') finish.extraActions = (finish.extraActions ?? 0) + 1;
      break;
    }
    case 'bottom-hand': {
      const cards = (frame.groups?.[effect.group] ?? []).filter(ref => {
        const card = state.cards[ref.instanceId];
        return (
          card?.zone === 'hand' &&
          card.owner === playerId &&
          card.incarnation === ref.incarnation &&
          card.visibility === ref.visibility
        );
      });
      if (cards.length)
        progressArrange(state, {
          kind: 'arrange-deck',
          owner: playerId,
          playerId,
          source,
          mode: 'hand-bottom',
          stage: 'order-bottom',
          cards,
          bottom: cards.map(c => c.instanceId),
          topOrder: [],
          bottomOrder: [],
        });
      break;
    }
    case 'reveal-deck-cards': {
      const owner = effect.player === 'enemy' ? opponent(state, playerId) : playerId;
      const cards = state.players[owner]!.deck.slice(0, effect.count).map(id =>
        reference(instance(state, id)),
      );
      if (cards.length) fact(state, 'revealed', playerId, cards, cards.length);
      state.execution.frames.unshift(
        ...effectFrames(playerId, source, effect.effects, {
          ...frame,
          groups: { ...frame.groups, [effect.group]: cards },
          values: { ...frame.values, 'revealed-count': cards.length },
        }),
      );
      break;
    }
    case 'bottom-deck-group': {
      const selected = (frame.groups?.[effect.group] ?? []).flatMap(ref => {
        const c = state.cards[ref.instanceId];
        return c &&
          c.zone === (effect.from ?? 'deck') &&
          c.incarnation === ref.incarnation &&
          c.visibility === ref.visibility
          ? [c]
          : [];
      });
      if (selected.some(c => c.owner !== selected[0]!.owner))
        throw new Error('Mixed bottom-deck owners');
      if (effect.from === 'discard') for (const card of selected) move(state, card, 'deck');
      if (effect.effects)
        state.execution.frames.unshift(
          ...effectFrames(playerId, source, effect.effects, {
            ...frame,
            values: {
              ...frame.values,
              ...(effect.countAs ? { [effect.countAs]: selected.length } : {}),
            },
          }),
        );
      if (selected.length)
        state.execution.frames.unshift({
          kind: 'random-bottom',
          owner: selected[0]!.owner,
          cards: selected.map(reference),
        });
      break;
    }
    case 'reveal-top': {
      const owner = effect.player === 'enemy' ? opponent(state, playerId) : playerId;
      const id = state.players[owner]!.deck[0];
      const card = id ? instance(state, id) : undefined;
      if (card) fact(state, 'revealed', owner, [card], 1);
      const bindings = { ...frame.bindings };
      delete bindings[effect.bind];
      if (card) bindings[effect.bind] = reference(card);
      state.execution.frames.unshift(
        ...effectFrames(playerId, source, effect.effects, { ...frame, bindings }),
      );
      break;
    }
    case 'reveal-hand': {
      const owner = effect.player === 'enemy' ? opponent(state, playerId) : playerId;
      const cards = state.players[owner]!.hand.map(id => instance(state, id));
      if (cards.length) {
        fact(state, 'revealed', owner, cards, cards.length);
        recordHandReveal(state, cards);
      }
      const values = {
        ...frame.values,
        ...(effect.count
          ? {
              [effect.count.bind]: cards.filter(c =>
                matchesCard(state, c, effect.count!.filter, frame),
              ).length,
            }
          : {}),
      };
      state.execution.frames.unshift(
        ...effectFrames(playerId, source, effect.effects, { ...frame, values }),
      );
      break;
    }
    case 'token-and-damage': {
      const unit = boundUnit(state, frame, effect.target);
      if (!unit || !isUnit(state, unit)) break;
      const token = planTokenCreation(frame, {
        kind: 'upgrade',
        token: effect.token,
        targets: [
          { target: reference(unit), count: Math.max(0, numericValue(state, frame, effect.count)) },
        ],
      });
      token.simultaneousDamage = {
        target: reference(unit),
        amount: Math.max(0, numericValue(state, frame, effect.damage)),
      };
      state.execution.frames.unshift(token);
      break;
    }
    case 'reveal-card': {
      const ref = boundReference(frame, effect.target, state),
        card = ref && state.cards[ref.instanceId];
      if (
        !card ||
        !ref ||
        card.cardId !== ref.cardId ||
        card.incarnation !== ref.incarnation ||
        card.visibility !== ref.visibility ||
        (effect.from !== undefined && card.zone !== effect.from)
      )
        break;
      fact(state, 'revealed', playerId, [card]);
      if (card.zone === 'hand') recordHandReveal(state, [card]);
      if (effect.effects)
        state.execution.frames.unshift(...effectFrames(playerId, source, effect.effects, frame));
      break;
    }
    case 'random-card': {
      const random = planRandomCard(state, frame);
      if (random) state.execution.frames.unshift(random);
      break;
    }
    case 'discard-random-hand':
    case 'random-discard': {
      const owner =
        effect.kind === 'discard-random-hand'
          ? effect.player === 'self'
            ? playerId
            : opponent(state, playerId)
          : boundUnit(state, frame, effect.ownerOf)?.owner;
      if (!owner) break;
      const cards = state.players[owner]!.hand.map(id => reference(instance(state, id)));
      if (cards.length)
        state.execution.frames.unshift({ kind: 'random-discard', playerId, owner, source, cards });
      break;
    }
    case 'defeat-resource': {
      const card = boundUnit(state, frame, effect.target);
      if (
        card &&
        card.zone === 'resources' &&
        state.players[card.controller]!.resources.includes(card.instanceId)
      ) {
        fact(state, 'defeated', playerId, [source, card]);
        move(state, card, 'discard');
      }
      break;
    }
    case 'move-card': {
      const card = boundUnit(state, frame, effect.target);
      if (
        !card ||
        card.zone !== effect.from ||
        (effect.fromPlayer &&
          card.owner !== (effect.fromPlayer === 'self' ? playerId : opponent(state, playerId)))
      )
        break;
      const zone = effect.to === 'deck-top' || effect.to === 'deck-bottom' ? 'deck' : effect.to;
      if (zone === 'discard')
        discardCards(state, [card], effect.discardBy === 'owner' ? card.owner : playerId, source);
      else move(state, card, zone);
      if (effect.to === 'deck-top') {
        const deck = state.players[card.owner]!.deck;
        deck.splice(deck.indexOf(card.instanceId), 1);
        deck.unshift(card.instanceId);
      }
      if (zone !== 'discard') {
        const type = zone === 'hand' ? 'returned-to-hand' : 'put-on-deck';
        if (effect.from === 'resources') {
          // Returning a private resource does not reveal its face. Both its
          // selecting controller and its owner may retain the private reference.
          fact(state, type, playerId, [source], 1);
          fact(state, type, playerId, [source, card], 1, [...new Set([playerId, card.owner])]);
        } else fact(state, type, playerId, [source, card]);
      }
      if (effect.effects)
        state.execution.frames.unshift(...effectFrames(playerId, source, effect.effects, frame));
      break;
    }
    case 'mill': {
      const owner =
        effect.player === 'defender'
          ? (boundUnit(state, frame, 'damaged-base')?.controller ??
            state.attacks.at(-1)?.defendingPlayer)
          : effect.player === 'self'
            ? playerId
            : opponent(state, playerId);
      if (!owner) break;
      const cards = state.players[owner]!.deck.slice(0, effect.count).map(id =>
        instance(state, id),
      );
      discardCards(state, cards, playerId, source);
      if (cards.length || effect.afterEvenIfEmpty) {
        state.execution.frames.unshift(
          ...effectFrames(playerId, source, effect.effects, {
            ...frame,
            bindings: {
              ...frame.bindings,
              ...(cards.length ? { [effect.bind]: reference(cards[0]!) } : {}),
            },
            groups: {
              ...frame.groups,
              ...(effect.group ? { [effect.group]: cards.map(reference) } : {}),
            },
          }),
        );
      }
      break;
    }
    case 'unit-to-deck': {
      const card = boundUnit(state, frame, effect.target);
      if (
        !card ||
        !isUnit(state, card) ||
        unitIsLeader(state, card) ||
        intent?.kind !== 'choose-mode'
      )
        break;
      fact(
        state,
        isToken(cardDefinition(state, card.cardId)) ? 'left-play' : 'put-on-deck',
        playerId,
        [source, card],
      );
      move(state, card, 'deck');
      card.damage = 0;
      if (card.zone === 'deck' && intent.mode === 'deck-top') {
        const deck = state.players[card.owner]!.deck;
        deck.splice(deck.indexOf(card.instanceId), 1);
        deck.unshift(card.instanceId);
      }
      maintenance(state);
      break;
    }
    case 'divide-damage': {
      const damageSource = effect.source ? boundUnit(state, frame, effect.source) : source;
      if (!damageSource) break;
      const amount = numericValue(state, frame, effect.amount);
      if (amount > 0 && matchingUnits(state, playerId, effect.filter, frame).length)
        state.execution.frames.unshift({
          kind: 'allocate-damage',
          playerId,
          source: structuredClone(damageSource),
          amount,
          filter: unitFilterSchema.parse(effect.filter),
          optional: effect.optional,
          ...(effect.after
            ? {
                after: {
                  playerId,
                  source: structuredClone(source),
                  effects: [...effect.after],
                  ...(frame.bindings ? { bindings: frame.bindings } : {}),
                  ...(frame.groups ? { groups: frame.groups } : {}),
                  ...(frame.values ? { values: frame.values } : {}),
                  ...(frame.names ? { names: frame.names } : {}),
                },
              }
            : {}),
          ...(effect.upTo ? { upTo: true } : {}),
          ...(frame.bindings ? { bindings: frame.bindings } : {}),
        });
      break;
    }
    case 'select-upgrades':
      if (effect.min === 'all')
        selections = matchingUpgrades(state, playerId, effect.filter, frame).map(c => c.instanceId);
      state.execution.frames.unshift(
        ...effectFrames(playerId, source, effect.effects, {
          ...frame,
          bindings: {
            ...frame.bindings,
            ...(effect.max === 1 && selections[0]
              ? { [effect.bind]: reference(instance(state, selections[0])) }
              : {}),
          },
          groups: {
            ...frame.groups,
            [effect.bind]: selections.map(id => reference(instance(state, id))),
          },
        }),
      );
      break;
    case 'move-upgrades': {
      const selected = (frame.groups?.[effect.group] ?? []).flatMap(ref => {
        const card = state.cards[ref.instanceId];
        return card &&
          card.incarnation === ref.incarnation &&
          isUpgrade(state, card) &&
          canAffectWithAbility(
            state,
            card,
            source,
            effect.to === 'discard' ? 'defeat' : 'return-to-hand',
          )
          ? [card]
          : [];
      });
      const parent = selected[0]?.attachedTo;
      const host = parent && reference(instance(state, parent.instanceId));
      let changed = 0;
      if (effect.to === 'discard') changed = defeatUpgrades(state, selected, source).length;
      else
        for (const card of selected) {
          changed++;
          if (cardDefinition(state, card.cardId).kind === 'leader') {
            defeatUpgrade(state, card);
            continue;
          }
          fact(
            state,
            isToken(cardDefinition(state, card.cardId)) ? 'left-play' : 'returned-to-hand',
            playerId,
            [source, card],
          );
          move(state, card, 'hand');
        }
      if (changed && effect.effects)
        state.execution.frames.unshift(
          ...effectFrames(playerId, source, effect.effects, {
            ...frame,
            bindings: {
              ...frame.bindings,
              ...(host && effect.bindHost ? { [effect.bindHost]: host } : {}),
            },
          }),
        );
      maintenance(state);
      break;
    }
    case 'select-resources': {
      const owner = effect.player === 'self' ? playerId : opponent(state, playerId);
      const selected = selections
        .map(id => instance(state, id))
        .filter(
          card =>
            effect.operation === 'inspect' ||
            effect.operation === 'defeat' ||
            card.exhausted !== (effect.operation === 'exhaust'),
        );
      if (effect.operation === 'defeat') {
        for (const card of selected) move(state, card, 'discard');
        if (selected.length) fact(state, 'defeated', playerId, [source, ...selected]);
      } else if (effect.operation !== 'inspect')
        for (const card of selected) card.exhausted = effect.operation === 'exhaust';
      if (selected.length && effect.operation !== 'defeat' && effect.operation !== 'inspect') {
        fact(
          state,
          effect.operation === 'exhaust' ? 'exhausted' : 'readied',
          owner,
          [],
          selected.length,
        );
        fact(
          state,
          effect.operation === 'exhaust' ? 'exhausted' : 'readied',
          owner,
          selected,
          selected.length,
          [owner],
        );
      }
      if (effect.effects)
        state.execution.frames.unshift(
          ...effectFrames(playerId, source, effect.effects, {
            ...frame,
            values: {
              ...frame.values,
              ...(effect.countAs ? { [effect.countAs]: selected.length } : {}),
            },
            groups: {
              ...frame.groups,
              ...(effect.group ? { [effect.group]: selected.map(reference) } : {}),
            },
          }),
        );
      break;
    }
    case 'gain-force':
      state.execution.frames.unshift(
        planTokenCreation(frame, { kind: 'force', recipient: playerId, count: 1 }),
      );
      break;
    case 'indirect-damage': {
      const recipient =
        effect.recipient === 'chosen'
          ? intent?.kind === 'choose-player'
            ? intent.playerId
            : undefined
          : effect.recipient === 'enemy'
            ? opponent(state, playerId)
            : state.attacks.at(-1)?.defendingPlayer;
      if (!recipient) break;
      const allocation = indirectFrame(
        state,
        playerId,
        source,
        recipient,
        numericValue(state, frame, effect.amount),
      );
      if (effect.after)
        allocation.after = {
          playerId,
          source: structuredClone(source),
          effects: structuredClone([...effect.after]),
          ...(frame.bindings ? { bindings: frame.bindings } : {}),
          ...(frame.groups ? { groups: frame.groups } : {}),
          ...(frame.values ? { values: frame.values } : {}),
          ...(frame.names ? { names: frame.names } : {}),
        };
      if (allocation.amount) state.execution.frames.unshift(allocation);
      break;
    }
    case 'modify-units': {
      const targets = matchingUnits(state, playerId, effect.filter, frame);
      const operation = {
        ...effect.operation,
        power: numericValue(state, frame, effect.operation.power),
        hp: numericValue(state, frame, effect.operation.hp),
      };
      for (const unit of targets) modifyUnit(state, source, unit, operation);
      maintenance(state);
      break;
    }
    case 'phase-stat-modifier':
      if (state.phase === 'action' || state.phase === 'regroup')
        state.phaseStatModifiers.push({
          source: structuredClone(source),
          playerId,
          filter: effect.filter,
          power: effect.power,
          hp: effect.hp,
          round: state.round,
          phase: state.phase,
        });
      maintenance(state);
      break;
    case 'with-value':
      state.execution.frames.unshift(
        ...effectFrames(playerId, source, effect.effects, {
          ...frame,
          values: { ...frame.values, [effect.name]: numericValue(state, frame, effect.value) },
        }),
      );
      break;
    case 'resource-top': {
      const owner = effect.player === 'enemy' ? opponent(state, playerId) : playerId;
      const id = state.players[owner]!.deck[0];
      if (!id) break;
      const card = instance(state, id);
      move(state, card, 'resources');
      card.exhausted = !effect.ready;
      fact(state, 'resourced', owner, [], 1);
      fact(state, 'resourced', owner, [card], 1, [owner]);
      break;
    }
    case 'select-target':
      if (target)
        state.execution.frames.unshift(
          ...effectFrames(playerId, source, effect.effects, {
            ...frame,
            bindings: { ...frame.bindings, [effect.bind]: reference(target) },
          }),
        );
      break;
    case 'damage-target': {
      const card = boundUnit(state, frame, effect.target);
      if (card && (isUnit(state, card) || cardDefinition(state, card.cardId).kind === 'base'))
        dealDamage(
          state,
          [{ target: card, amount: Math.max(0, numericValue(state, frame, effect.amount)) }],
          playerId,
          source,
        );
      break;
    }
    case 'select-units':
      state.execution.frames.unshift(
        ...effectFrames(playerId, source, effect.effects, {
          ...frame,
          groups: {
            ...frame.groups,
            [effect.bind]: selections.map(id => reference(instance(state, id))),
          },
        }),
      );
      break;
    case 'defeat-tokens': {
      const selected = selections.map(id => instance(state, id));
      const units = selected.filter(card => isUnit(state, card));
      const upgrades = selected.filter(card => isUpgrade(state, card));
      const playerTokens = selected.filter(
        c => cardDefinition(state, c.cardId).kind === 'player-token',
      );
      const count = selected.length;
      defeatUnits(state, units, [], source);
      defeatUpgrades(
        state,
        upgrades.filter(card => isUpgrade(state, card)),
        source,
      );
      for (const token of playerTokens) {
        fact(state, 'defeated', playerId, [source, token]);
        move(state, token, 'set-aside');
      }
      state.execution.frames.unshift(
        ...effectFrames(playerId, source, effect.effects, {
          ...frame,
          values: { ...frame.values, [effect.countAs]: count },
        }),
      );
      maintenance(state);
      break;
    }
    case 'defeat-group': {
      const targets = (frame.groups?.[effect.group] ?? [])
        .map(ref => state.cards[ref.instanceId]!)
        .filter(
          unit =>
            isUnit(state, unit) &&
            frame.groups![effect.group]!.some(
              ref => ref.instanceId === unit.instanceId && ref.incarnation === unit.incarnation,
            ),
        );
      const unique = [...new Map(targets.map(c => [c.instanceId, c])).values()];
      const defeated = defeatUnits(state, unique, [], source);
      state.execution.frames.unshift(
        ...effectFrames(playerId, source, effect.effects, {
          ...frame,
          values: { ...frame.values, [effect.countAs]: defeated.length },
        }),
      );
      maintenance(state);
      break;
    }
    case 'return-unit-with-upgrades': {
      const unit = boundUnit(state, frame, effect.target);
      if (
        !unit ||
        !isUnit(state, unit) ||
        !canAffectWithAbility(state, unit, source, 'return-to-hand')
      )
        break;
      const wasLeader = unitIsLeader(state, unit);
      const observers = captureObservers(state),
        departure = captureDeparture(state, unit, observers);
      const selected = (frame.groups?.[effect.upgrades] ?? []).flatMap(ref => {
        const c = state.cards[ref.instanceId];
        return c &&
          c.incarnation === ref.incarnation &&
          isUpgrade(state, c) &&
          c.attachedTo?.instanceId === unit.instanceId &&
          c.attachedTo.incarnation === unit.incarnation &&
          cardDefinition(state, c.cardId).kind !== 'leader' &&
          canAffectWithAbility(state, c, source, 'return-to-hand')
          ? [c]
          : [];
      });
      const snapshots = new Map(
        selected.map(c => [c.instanceId, captureUpgradeDeparture(state, c)]),
      );
      const rescued: CardInstance[] = [];
      for (const card of selected) {
        fact(
          state,
          isToken(cardDefinition(state, card.cardId)) ? 'left-play' : 'returned-to-hand',
          playerId,
          [source, card],
        );
        move(state, card, 'hand', undefined, rescued, snapshots.get(card.instanceId));
      }
      if (wasLeader)
        defeatUnits(state, [unit], [], undefined, false, { departures: [departure], observers });
      else {
        fact(
          state,
          isToken(cardDefinition(state, unit.cardId)) ? 'left-play' : 'returned-to-hand',
          playerId,
          [source, unit],
        );
        move(state, unit, 'hand', departure, rescued);
        unit.damage = 0;
      }
      for (const prisoner of rescued) rescueCaptured(state, prisoner);
      if (effect.freeNextCopy && (state.phase === 'action' || state.phase === 'regroup'))
        state.playModifiers.push({
          id: allocateId(state, 'p'),
          source: structuredClone(source),
          playerId,
          filter: { kind: 'unit' },
          optionalFreeCopy: unit.cardId,
          discount: 0,
          ready: false,
          round: state.round,
          phase: state.phase,
        });
      maintenance(state);
      break;
    }
    case 'return-bound': {
      const units = [
        ...new Map(
          effect.targets
            .flatMap(name => {
              const c = boundUnit(state, frame, name);
              return c &&
                isUnit(state, c) &&
                !unitIsLeader(state, c) &&
                canAffectWithAbility(state, c, source, 'return-to-hand')
                ? [c]
                : [];
            })
            .map(c => [c.instanceId, c]),
        ).values(),
      ];
      const departures = new Map(units.map(c => [c.instanceId, captureDeparture(state, c)]));
      const rescued: CardInstance[] = [];
      for (const c of units) {
        fact(
          state,
          isToken(cardDefinition(state, c.cardId)) ? 'left-play' : 'returned-to-hand',
          playerId,
          [source, c],
        );
        move(state, c, 'hand', departures.get(c.instanceId), rescued);
        c.damage = 0;
      }
      for (const prisoner of rescued) rescueCaptured(state, prisoner);
      maintenance(state);
      break;
    }
    case 'defeat-bound': {
      const units = effect.targets
        .map(name => boundUnit(state, frame, name))
        .filter((c): c is CardInstance => !!c && isUnit(state, c));
      defeatUnits(state, [...new Map(units.map(c => [c.instanceId, c])).values()], [], source);
      maintenance(state);
      break;
    }
    case 'damage-bound': {
      const targets = effect.targets
        .map(name => boundUnit(state, frame, name))
        .filter(
          (c): c is CardInstance =>
            !!c && (isUnit(state, c) || cardDefinition(state, c.cardId).kind === 'base'),
        );
      dealDamage(
        state,
        targets.map(target => ({ target, amount: effect.amount })),
        playerId,
        source,
      );
      break;
    }
    case 'create-unit': {
      const creator = effect.creatorOf
        ? boundController(state, frame, effect.creatorOf)
        : effect.player === 'enemy'
          ? opponent(state, playerId)
          : playerId;
      if (!creator) break;
      state.execution.frames.unshift(
        planTokenCreation(
          frame,
          {
            kind: 'unit',
            cardId: effect.cardId,
            count: Math.max(0, numericValue(state, frame, effect.count)),
            ...(effect.phaseAbilities
              ? { phaseAbilities: simpleAbilitiesSchema.parse(effect.phaseAbilities) }
              : {}),
          },
          {
            after: effect.effects ? [...effect.effects] : undefined,
            bind: effect.bind,
            group: effect.group,
            creator,
          },
        ),
      );
      break;
    }
    case 'pay': {
      const current = effectCostSource(
        state,
        source,
        effect.costs,
        effect.player === 'enemy' ? opponent(state, playerId) : playerId,
      );
      if (!current || intent?.kind !== 'accept-effect') {
        state.execution.frames.unshift(
          ...effectFrames(playerId, source, effect.otherwise ?? [], frame),
        );
        break;
      }
      payAbilityCosts(
        state,
        current,
        {
          id: 'effect-payment',
          costs: effect.costs,
          limit: null,
          effects: [],
        },
        credit + unitPayment,
        undefined,
        costSelections,
      );
      fact(state, 'ability-used', playerId, [source]);
      state.execution.frames.unshift(...effectFrames(playerId, source, effect.effects, frame));
      applyCardCosts(state, current, effect.costs, costSelections);
      break;
    }
    case 'defeat-self-upgrade': {
      const current = sameIncarnation(state, source);
      if (current) defeatUpgrade(state, current);
      break;
    }
    case 'restrict-named-card': {
      const name = frame.names?.[effect.name];
      if (!name) throw new Error('Missing named card binding');
      state.namedEffects.push({
        id: allocateId(state, 'n'),
        source: reference(source),
        playerId,
        name,
        restriction: effect.restriction,
        appliesTo: effect.appliesTo ?? 'enemy',
        expires:
          effect.duration === 'phase'
            ? { kind: 'phase', round: state.round, phase: state.phase }
            : { kind: 'source-in-play' },
      });
      maintenance(state);
      break;
    }
    case 'choose-number':
    case 'name-card':
      throw new Error('Naming requires a catalog choice');
    case 'exchange-control': {
      const first = boundUnit(state, frame, effect.first),
        second = boundUnit(state, frame, effect.second);
      if (
        first &&
        second &&
        !unitIsLeader(state, first) &&
        !unitIsLeader(state, second) &&
        exchangeControl(state, first, second)
      ) {
        state.execution.frames.unshift(...effectFrames(playerId, source, effect.effects, frame));
        maintenance(state);
      }
      break;
    }
    case 'defeat-credits': {
      for (const id of selections) defeatCredit(state, instance(state, id), playerId);
      state.execution.frames.unshift(
        ...effectFrames(playerId, source, effect.effects, {
          ...frame,
          values: { ...frame.values, [effect.countAs]: selections.length },
        }),
      );
      break;
    }
    case 'after-attack': {
      const attack = state.attacks.at(-1);
      if (attack)
        (attack.after ??= []).push(...effectFrames(playerId, source, effect.effects, frame));
      break;
    }
    case 'resource-departed': {
      const ref = boundReference(frame, effect.target, state),
        card = ref && state.cards[ref.instanceId];
      const departure =
        ref &&
        state.departedUnits.find(
          d =>
            d.reference.instanceId === ref.instanceId &&
            d.reference.incarnation === ref.incarnation,
        );
      if (card && departure && card.zone === 'discard' && card.incarnation === ref!.incarnation) {
        const old = reference(card);
        resourceCard(state, card, departure.controller, false);
        fact(state, 'resourced', departure.controller, [source, old], 1);
        fact(state, 'resourced', departure.controller, [card], 1, [departure.controller]);
      }
      break;
    }
    case 'schedule-regroup-operation': {
      const target = boundUnit(state, frame, effect.target);
      if (target && (isUnit(state, target) || isUpgrade(state, target))) {
        state.delayedEffects.push({
          kind: 'regroup-operation',
          id: allocateId(state, 'l'),
          playerId,
          source: structuredClone(source),
          target: reference(target),
          dueRound: state.round + (state.phase === 'regroup' ? 1 : 0),
          operation: effect.operation,
          ...(frame.origin ? { origin: structuredClone(frame.origin) } : {}),
        });
        fact(state, 'delayed-scheduled', playerId, [source, target]);
      }
      break;
    }
    case 'prevent-base-healing':
      for (const seat of state.seats)
        modifyUnit(state, source, instance(state, state.players[seat]!.base), {
          kind: 'modify',
          power: 0,
          hp: 0,
          cannotHeal: true,
          duration: 'phase',
        });
      break;
    case 'choose-mode': {
      if (intent?.kind !== 'choose-mode') break;
      const option = effect.options.find(option => option.id === intent.mode);
      if (!option) throw new IllegalInput();
      const chooser =
        effect.chooser === 'enemy'
          ? opponent(state, playerId)
          : effect.chooserOf
            ? (boundUnit(state, frame, effect.chooserOf)?.controller ?? playerId)
            : playerId;
      fact(
        state,
        'mode-chosen',
        chooser,
        [source],
        undefined,
        effect.private ? [chooser] : 'public',
      );
      state.facts.at(-1)!.mode = option.id;
      state.execution.frames.unshift(...effectFrames(playerId, source, option.effects, frame));
      break;
    }
    case 'if':
      if (conditionMatches(state, playerId, effect.condition, frame))
        state.execution.frames.unshift(...effectFrames(playerId, source, effect.effects, frame));
      else if (effect.otherwise)
        state.execution.frames.unshift(...effectFrames(playerId, source, effect.otherwise, frame));
      break;
    case 'ready-leader':
      if (
        target &&
        cardDefinition(state, target.cardId).kind === 'leader' &&
        !target.deployedAs &&
        target.exhausted
      ) {
        target.exhausted = false;
        fact(state, 'readied', playerId, [source, target]);
      }
      break;
    case 'ready-units': {
      const cards = readyInPlay(state, matchingUnits(state, playerId, effect.filter, frame));
      if (cards.length) fact(state, 'readied', playerId, [source, ...cards]);
      break;
    }
    case 'units-damage-target': {
      const target = boundUnit(state, frame, effect.target);
      if (target && isUnit(state, target))
        dealDamage(
          state,
          matchingUnits(state, playerId, effect.filter, frame).map(unit => ({
            target,
            source: unit,
            amount: unitStats(state, unit).power,
          })),
          playerId,
          source,
        );
      break;
    }
    case 'exhaust-units':
    case 'exhaust-group': {
      const refs =
        effect.kind === 'exhaust-units'
          ? matchingUnits(state, playerId, effect.filter, frame)
          : (frame.groups?.[effect.group] ?? []);
      const cards = refs.flatMap(ref => {
        const card = state.cards[ref.instanceId];
        return card &&
          card.incarnation === ref.incarnation &&
          isUnit(state, card) &&
          !card.exhausted &&
          canAffectWithAbility(state, card, source, 'exhaust')
          ? [card]
          : [];
      });
      for (const card of cards) card.exhausted = true;
      if (cards.length) fact(state, 'exhausted', playerId, [source, ...cards]);
      if (effect.kind === 'exhaust-group' && effect.effects)
        state.execution.frames.unshift(
          ...effectFrames(playerId, source, effect.effects, {
            ...frame,
            values: {
              ...frame.values,
              ...(effect.countAs ? { [effect.countAs]: cards.length } : {}),
            },
          }),
        );
      break;
    }
    case 'capture-pairs': {
      const { effect: _effect, kind: _kind, ...context } = frame;
      state.execution.frames.unshift({
        ...context,
        kind: 'capture-pairs',
        guards: matchingUnits(state, playerId, { controller: 'friendly' }, frame).map(reference),
        chosenGuard: null,
        pairs: [],
      });
      break;
    }
    case 'attack-series': {
      const { effect: _effect, kind: _kind, ...context } = frame;
      state.execution.frames.unshift({ ...context, ...effect, used: [] });
      break;
    }
    case 'capture-group': {
      const guard = boundUnit(state, frame, effect.guard);
      if (guard)
        for (const ref of frame.groups?.[effect.group] ?? []) {
          const unit = state.cards[ref.instanceId];
          if (unit && unit.incarnation === ref.incarnation)
            captureUnit(state, guard, unit, playerId, source);
        }
      maintenance(state);
      break;
    }
    case 'capture-unit': {
      const guard =
        effect.guard === 'own-base'
          ? instance(state, state.players[playerId]!.base)
          : boundUnit(state, frame, effect.guard);
      const unit = boundUnit(state, frame, effect.target);
      if (
        guard &&
        unit &&
        captureUnit(state, guard, unit, playerId, source, effect.from) &&
        effect.rescueAtRegroup &&
        unit.zone === 'captured'
      )
        scheduleRegroup(state, playerId, source, unit, 'rescue-at-regroup');
      maintenance(state);
      break;
    }
    case 'select-departed-upgrade':
      if (target)
        state.execution.frames.unshift(
          ...effectFrames(playerId, source, effect.effects, {
            ...frame,
            bindings: { ...frame.bindings, [effect.bind]: reference(target) },
          }),
        );
      break;
    case 'select-unit':
      if (target || effect.allowMissing)
        state.execution.frames.unshift(
          ...effectFrames(playerId, source, effect.effects, {
            ...frame,
            bindings: {
              ...frame.bindings,
              ...(target ? { [effect.bind]: reference(target) } : {}),
            },
          }),
        );
      else if (effect.otherwise)
        state.execution.frames.unshift(...effectFrames(playerId, source, effect.otherwise, frame));
      break;
    case 'each-unit': {
      const operation = effect.effects.length === 1 ? effect.effects[0] : undefined;
      if (
        operation?.kind === 'on-unit' &&
        operation.target === effect.bind &&
        operation.operation.kind === 'give-token' &&
        !operation.creatorOf &&
        !operation.ifYouDo
      ) {
        const targets = matchingUnits(state, playerId, effect.filter, frame).map(unit => ({
          target: reference(unit),
          count: Math.max(
            0,
            numericValue(
              state,
              { ...frame, bindings: { ...frame.bindings, [effect.bind]: reference(unit) } },
              operation.operation.kind === 'give-token' ? operation.operation.count : 0,
            ),
          ),
        }));
        state.execution.frames.unshift(
          planTokenCreation(frame, { kind: 'upgrade', token: operation.operation.token, targets }),
        );
        break;
      }
      state.execution.frames.unshift(
        ...matchingUnits(state, playerId, effect.filter, frame).flatMap(unit =>
          effectFrames(playerId, source, effect.effects, {
            ...frame,
            bindings: { ...frame.bindings, [effect.bind]: reference(unit) },
          }),
        ),
      );
      break;
    }
    case 'attack-bound':
      if (intent?.kind === 'attack') {
        beginAttack(
          state,
          instance(state, intent.attacker),
          instance(state, intent.defender),
          playerId,
          numericValue(
            state,
            {
              ...frame,
              bindings: {
                ...frame.bindings,
                attacker: reference(instance(state, intent.attacker)),
                defender: reference(instance(state, intent.defender)),
              },
            },
            effect.powerBonus ?? 0,
          ),
          attackEffectOrigins(state, frame).map(origin => ({
            ...origin,
            id: allocateId(state, 'g'),
          })),
          !!effect.combatFirst && conditionMatches(state, playerId, effect.combatFirst, frame),
          false,
          {
            source,
            preventDamage: effect.preventDamage,
            blankDefender: effect.blankDefender,
            defenderPowerModifier: effect.defenderPowerModifier,
            damageStat: effect.damageStat,
            after: effect.after ? effectFrames(playerId, source, effect.after, frame) : undefined,
          },
        );
      }
      break;
    case 'prevent-next-base-damage': {
      const base = boundUnit(state, frame, effect.target);
      if (base && cardDefinition(state, base.cardId).kind === 'base')
        modifyUnit(state, source, base, {
          kind: 'modify',
          power: 0,
          hp: 0,
          duration: 'phase',
          preventNextDamage: 'all',
        });
      break;
    }
    case 'heal-target': {
      const ref = boundReference(frame, effect.target, state);
      const target = ref && state.cards[ref.instanceId];
      if (
        target &&
        target.incarnation === ref!.incarnation &&
        (isUnit(state, target) || cardDefinition(state, target.cardId).kind === 'base')
      ) {
        const amount = healingAmount(state, target, effect.amount);
        target.damage -= amount;
        recordHealing(state, playerId, source, target, amount);
      }
      break;
    }
    case 'exhaust-bound': {
      const targets = new Map(
        effect.targets.flatMap(name => {
          const unit = boundUnit(state, frame, name);
          return unit && isUnit(state, unit) ? [[unit.instanceId, unit] as const] : [];
        }),
      );
      const changed = [...targets.values()].filter(
        unit => !unit.exhausted && canAffectWithAbility(state, unit, source, 'exhaust'),
      );
      for (const unit of changed) unit.exhausted = true;
      if (changed.length) fact(state, 'exhausted', playerId, [source, ...changed]);
      state.execution.frames.unshift(
        ...effectFrames(playerId, source, effect.effects, {
          ...frame,
          values: { ...frame.values, [effect.countAs]: changed.length },
        }),
      );
      break;
    }
    case 'on-unit': {
      const unit = boundUnit(state, frame, effect.target);
      if (!unit || !isUnit(state, unit)) break;
      const op = effect.operation;
      // Continuation stays behind any damage replacement or maintenance frames.
      const next = effect.ifYouDo ? effectFrames(playerId, source, effect.ifYouDo, frame) : [];
      switch (op.kind) {
        case 'take-control':
          if (
            unitIsLeader(state, unit) &&
            unit.controller !==
              (op.player === 'owner'
                ? unit.owner
                : op.player === 'self'
                  ? playerId
                  : opponent(state, playerId)) &&
            !effectiveAbilities(state, unit).cannotChangeController
          ) {
            defeatUnits(state, [unit]);
            maintenance(state);
            break;
          }
          if (
            changeControl(
              state,
              unit,
              op.player === 'owner'
                ? unit.owner
                : op.player === 'self'
                  ? playerId
                  : opponent(state, playerId),
            )
          ) {
            if (op.returnWhen)
              scheduleRegroup(
                state,
                playerId,
                source,
                unit,
                op.returnWhen === 'regroup' ? 'control-at-regroup' : 'control-on-departure',
                undefined,
                frame.origin,
              );
            state.execution.frames.unshift(...next);
            maintenance(state);
          }
          break;
        case 'move-arena':
          if (unit.zone !== op.arena) {
            move(state, unit, op.arena);
            fact(state, 'moved-arena', playerId, [source, unit]);
            state.execution.frames.unshift(...next);
            maintenance(state);
          }
          break;
        case 'heal': {
          const amount = op.amount === 'all' ? unit.damage : Math.min(unit.damage, op.amount);
          unit.damage -= amount;
          recordHealing(state, playerId, source, unit, amount);
          if (effect.ifYouDo && amount > 0)
            state.execution.frames.unshift(
              ...effectFrames(playerId, source, effect.ifYouDo, {
                ...frame,
                values: { ...frame.values, ...(op.countAs ? { [op.countAs]: amount } : {}) },
              }),
            );
          break;
        }
        case 'damage':
          state.execution.frames.unshift(...next);
          dealDamage(
            state,
            [
              {
                target: unit,
                amount: numericValue(state, frame, op.amount),
                ...(op.unpreventable ? { unpreventable: true } : {}),
              },
            ],
            playerId,
            op.source ? boundUnit(state, frame, op.source) : source,
          );
          break;
        case 'modify':
          modifyUnit(state, source, unit, {
            ...op,
            power: numericValue(state, frame, op.power),
            hp: numericValue(state, frame, op.hp),
          });
          state.execution.frames.unshift(...next);
          maintenance(state);
          break;
        case 'exhaust':
        case 'ready': {
          if (
            unit.exhausted === (op.kind === 'exhaust') ||
            (op.kind === 'ready' && cannotReady(state, unit)) ||
            (op.kind === 'exhaust' && !canAffectWithAbility(state, unit, source, 'exhaust'))
          )
            break;
          if (op.kind === 'ready') readyInPlay(state, [unit]);
          else unit.exhausted = true;
          fact(state, unit.exhausted ? 'exhausted' : 'readied', playerId, [source, unit]);
          state.execution.frames.unshift(...next);
          break;
        }
        case 'return-to-hand':
          if (!canAffectWithAbility(state, unit, source, 'return-to-hand')) break;
          if (unitIsLeader(state, unit)) {
            if (defeatUnits(state, [unit]).length) state.execution.frames.unshift(...next);
            maintenance(state);
            break;
          }
          fact(
            state,
            isToken(cardDefinition(state, unit.cardId)) ? 'left-play' : 'returned-to-hand',
            playerId,
            [source, unit],
          );
          move(state, unit, 'hand');
          unit.damage = 0;
          state.execution.frames.unshift(...next);
          maintenance(state);
          break;
        case 'defeat':
          if (defeatUnits(state, [unit], [], source).length)
            state.execution.frames.unshift(...next);
          maintenance(state);
          break;
        case 'defeat-shields':
          defeatUpgrades(
            state,
            attachedUpgrades(state, unit).filter(upgrade => {
              const d = cardDefinition(state, upgrade.cardId);
              return d.kind === 'upgrade' && d.replacement?.kind === 'shield';
            }),
            source,
          );
          state.execution.frames.unshift(...next);
          break;
        case 'give-token':
          state.execution.frames.unshift(
            planTokenCreation(
              frame,
              {
                kind: 'upgrade',
                token: op.token,
                targets: [
                  {
                    target: reference(unit),
                    count: Math.max(0, numericValue(state, frame, op.count)),
                  },
                ],
              },
              {
                after: effect.ifYouDo ? [...effect.ifYouDo] : undefined,
                ...(effect.creatorOf
                  ? { creator: boundController(state, frame, effect.creatorOf) }
                  : {}),
              },
            ),
          );
          break;
      }
      break;
    }
    case 'support':
      if (intent?.kind === 'attack')
        beginAttack(
          state,
          instance(state, intent.attacker),
          instance(state, intent.defender),
          playerId,
          0,
          supportOrigins(state, source),
        );
      break;
    case 'draw-cards':
      draw(
        state,
        [effect.player === 'enemy' ? opponent(state, playerId) : playerId],
        Math.max(0, numericValue(state, frame, effect.amount)),
      );
      break;
    case 'damage-own-base':
      dealDamage(
        state,
        [
          {
            target: instance(state, state.players[playerId]!.base),
            amount: numericValue(state, frame, effect.amount),
          },
        ],
        playerId,
        source,
      );
      break;
    case 'damage-base':
      if (target) dealDamage(state, [{ target, amount: effect.amount }], playerId, source);
      break;
    case 'heal-units': {
      const targets = matchingUnits(state, playerId, effect.filter, frame);
      const healed = targets.map(unit => ({
        unit,
        amount: effect.amount === 'all' ? unit.damage : Math.min(unit.damage, effect.amount),
      }));
      for (const { unit, amount } of healed) unit.damage -= amount;
      for (const { unit, amount } of healed) recordHealing(state, playerId, source, unit, amount);
      break;
    }
    case 'damage-units': {
      const targets =
        effect.max === undefined
          ? matchingUnits(state, playerId, effect.filter, frame)
          : selections.map(id => instance(state, id));
      dealDamage(
        state,
        targets.map(target => ({
          target,
          amount: Math.max(
            0,
            numericValue(
              state,
              effect.bind
                ? { ...frame, bindings: { ...frame.bindings, [effect.bind]: reference(target) } }
                : frame,
              effect.amount,
            ),
          ),
        })),
        playerId,
        effect.source ? boundUnit(state, frame, effect.source) : source,
        undefined,
        effect.after
          ? {
              playerId,
              source,
              bindings: frame.bindings,
              groups: frame.groups,
              values: frame.values,
              names: frame.names,
              effects: [...effect.after],
            }
          : undefined,
      );
      break;
    }
    case 'defeat-unit':
      if (target) {
        defeatUnits(state, [target], [], source);
        maintenance(state);
        if (effect.healOwnBase && !state.result) {
          const base = instance(state, state.players[playerId]!.base);
          const healed = healingAmount(state, base, effect.healOwnBase);
          base.damage -= healed;
          recordHealing(state, playerId, source, base, healed);
        }
      }
      break;
    case 'defeat-units': {
      const targets = matchingUnits(state, playerId, effect.filter, frame);
      const enemyIds = new Set(
        targets.filter(card => card.controller !== playerId).map(c => c.instanceId),
      );
      const defeated = defeatUnits(state, targets, [], source);
      const enemies = defeated.filter(card => enemyIds.has(card.instanceId)).length;
      maintenance(state);
      if (effect.damageEnemyBase && enemies && !state.result)
        dealDamage(
          state,
          Array.from({ length: enemies }, () => ({
            target: instance(state, state.players[opponent(state, playerId)]!.base),
            amount: effect.damageEnemyBase!,
          })),
          playerId,
          source,
        );
      break;
    }
    case 'defeat-defender-shields': {
      const attack = state.attacks.findLast(
        a =>
          a.attacker.instanceId === source.instanceId &&
          a.attacker.incarnation === source.incarnation,
      );
      const defender = attack && instance(state, attack.defender.instanceId);
      if (
        defender &&
        isUnit(state, defender) &&
        defender.incarnation === attack!.defender.incarnation &&
        !attack!.removedFromCombat.some(
          ref => ref.instanceId === defender.instanceId && ref.incarnation === defender.incarnation,
        )
      )
        defeatUpgrades(
          state,
          attachedUpgrades(state, defender).filter(upgrade => {
            const d = cardDefinition(state, upgrade.cardId);
            return d.kind === 'upgrade' && d.replacement?.kind === 'shield';
          }),
          source,
        );
      break;
    }
    case 'heal-own-base': {
      const healingPlayer = effect.player === 'enemy' ? opponent(state, playerId) : playerId;
      const base = instance(state, state.players[healingPlayer]!.base);
      const healed = healingAmount(state, base, numericValue(state, frame, effect.amount));
      base.damage -= healed;
      recordHealing(state, healingPlayer, source, base, healed);
      break;
    }
    case 'damage-defender': {
      const attack = state.attacks.findLast(
        attack =>
          attack.attacker.instanceId === source.instanceId &&
          attack.attacker.incarnation === source.incarnation,
      );
      if (!attack) break;
      const defender = instance(state, attack.defender.instanceId),
        current = instance(state, source.instanceId);
      if (
        defender.incarnation !== attack.defender.incarnation ||
        !isUnit(state, defender) ||
        attack.removedFromCombat.some(
          ref => ref.instanceId === defender.instanceId && ref.incarnation === defender.incarnation,
        )
      )
        break;
      const upgraded =
        current.incarnation === source.incarnation && isUnit(state, current)
          ? attachedUpgrades(state, current).length > 0
          : state.departedUnits.find(
              entry =>
                entry.reference.instanceId === source.instanceId &&
                entry.reference.incarnation === source.incarnation,
            )?.upgraded;
      dealDamage(
        state,
        [{ target: defender, amount: upgraded ? effect.upgradedAmount : effect.amount }],
        playerId,
        source,
      );
      break;
    }
    case 'play-unit':
      if (intent?.kind === 'play') {
        // A modified play is a nested action. Uniqueness is queued ahead of its trigger boundary.
        state.execution.frames.unshift({ kind: 'flush-triggers' });
        const unit = playFromZone(
          state,
          playerId,
          intent,
          effect.discount,
          effect.ready,
          'hand',
          false,
          false,
          credit,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          unitPayment,
        );
        if (effect.defeatAtRegroup) scheduleRegroup(state, playerId, source, unit);
      }
      break;
    case 'look-deck': {
      const owner = effect.player === 'enemy' ? opponent(state, playerId) : playerId;
      const cards = state.players[owner]!.deck.slice(0, effect.count).map(id =>
        reference(instance(state, id)),
      );
      if (cards.length) {
        fact(state, 'looked-at', playerId, cards, cards.length, [playerId]);
        progressArrange(state, {
          kind: 'arrange-deck',
          owner,
          playerId,
          source,
          mode: effect.mode,
          ...(effect.minDiscard !== undefined ? { minDiscard: effect.minDiscard } : {}),
          stage: effect.mode === 'discard-one' ? 'choose-discard' : 'choose-bottom',
          cards,
          bottom: [],
          topOrder: [],
          bottomOrder: [],
        });
      }
      break;
    }
    case 'search-deck': {
      const owner = effect.player === 'enemy' ? opponent(state, playerId) : playerId;
      const resolved = resolvedSearchEffectSchema.parse({
        ...effect,
        count: Math.min(
          120,
          Math.max(0, numericValue(state, frame, effect.count)) *
            (owner === playerId
              ? abilitySources(state)
                  .filter(c => c.controller === playerId)
                  .reduce((n, c) => n * (effectiveAbilities(state, c).searchMultiplier ?? 1), 1)
              : 1),
        ),
      });
      const cards = state.players[owner]!.deck.slice(0, resolved.count).map(id =>
        reference(instance(state, id)),
      );
      fact(state, 'searched', owner, [source], cards.length);
      if (cards.length) {
        fact(state, 'looked-at', owner, cards, cards.length, [owner]);
        state.execution.frames.unshift({
          kind: 'search',
          playerId,
          source,
          effect: resolved,
          cards,
          ...(frame.origin ? { origin: frame.origin } : {}),
          ...(frame.bindings ? { bindings: frame.bindings } : {}),
          ...(frame.groups ? { groups: frame.groups } : {}),
          ...(frame.values ? { values: frame.values } : {}),
          ...(frame.names ? { names: frame.names } : {}),
        });
      } else {
        state.execution.frames.unshift(...searchAfterFrames({ ...frame, effect }));
      }
      break;
    }
    case 'attack-with-unit':
      if (intent?.kind === 'attack')
        beginAttack(
          state,
          instance(state, intent.attacker),
          instance(state, intent.defender),
          playerId,
          effect.powerBonus === 'hand-size'
            ? state.players[playerId]!.hand.length
            : effect.powerBonus,
          effect.grantSourceTriggers
            ? [
                {
                  id: allocateId(state, 'g'),
                  card: structuredClone(source),
                  profile: 'attack-grant',
                  withoutSupport: false,
                },
              ]
            : [],
          false,
          false,
          { redirectExcess: effect.redirectExcess, source },
        );
      break;
    case 'schedule-next-action':
      scheduleNextAction(state, playerId, source, effect.effects);
      break;
    case 'tax-units': {
      const chooser = effect.player === 'self' ? playerId : opponent(state, playerId);
      const cards = [...state.ground, ...state.space]
        .map(id => instance(state, id))
        .filter(c => isUnit(state, c) && c.controller === chooser);
      if (cards.length)
        state.execution.frames.unshift({
          kind: 'unit-tax',
          playerId,
          chooser,
          source,
          amount: effect.amount,
          cards: cards.map(reference),
        });
      break;
    }
    case 'choose-self-token': {
      const card = sameIncarnation(state, source);
      if (card && isUnit(state, card) && intent?.kind === 'choose-token')
        state.execution.frames.unshift(
          planTokenCreation(frame, {
            kind: 'upgrade',
            token: intent.token,
            targets: [{ target: reference(card), count: 1 }],
          }),
        );
      break;
    }
    case 'give-self-token': {
      const card = sameIncarnation(state, source);
      if (card && isUnit(state, card))
        state.execution.frames.unshift(
          planTokenCreation(frame, {
            kind: 'upgrade',
            token: effect.token,
            targets: [{ target: reference(card), count: 1 }],
          }),
        );
      break;
    }
    case 'defeat-upgrade':
      if (target) {
        defeatUpgrade(state, target, undefined, source);
        maintenance(state);
      }
      break;
    case 'damage-bases': {
      const players = effect.targets === 'each' ? state.seats : [opponent(state, playerId)];
      dealDamage(
        state,
        players.map(id => ({
          target: instance(state, state.players[id]!.base),
          amount: effect.amount,
        })),
        playerId,
        source,
      );
      break;
    }
    case 'damage-unit':
      if (target)
        dealDamage(
          state,
          [
            {
              target,
              amount:
                typeof effect.amount === 'number'
                  ? effect.amount
                  : effect.amount === 'source-power'
                    ? sourcePower(state, source)
                    : effect.amount === 'hand-size'
                      ? state.players[playerId]!.hand.length
                      : Math.max(0, unitStats(state, target).hp - target.damage - 1),
            },
          ],
          playerId,
          source,
        );
      break;
    case 'heal-unit':
    case 'heal-base':
      if (target) {
        const healed = healingAmount(state, target, effect.amount);
        target.damage -= healed;
        recordHealing(state, playerId, source, target, healed);
      }
      break;
    case 'self-resource': {
      if (effect.optional !== false && intent?.kind !== 'accept-effect') break;
      const card = instance(state, source.instanceId);
      if (
        card.incarnation !== source.incarnation ||
        !(card.zone === 'discard' || isUnit(state, card))
      )
        break;
      if (cardDefinition(state, card.cardId).kind === 'leader') {
        defeatUnits(state, [card]);
        maintenance(state);
        break;
      }
      if (!resourceCard(state, card, playerId, effect.ready !== false)) break;
      // The old public source is known; the new hidden incarnation is private.
      fact(state, 'resource-returned', playerId, [source]);
      fact(state, 'resourced', playerId, [card], 1, [playerId]);
      maintenance(state);
      break;
    }
    case 'ambush':
      if (target) {
        // V8 §7.5.5 permits an exhausted attacker; it does not ready that unit.
        beginAttack(
          state,
          instance(state, source.instanceId),
          target,
          playerId,
          0,
          [],
          false,
          true,
        );
      }
      break;
    case 'deploy': {
      const card = instance(state, source.instanceId);
      if (
        cardDefinition(state, card.cardId).kind !== 'leader' ||
        card.deployedAs !== null ||
        card.incarnation !== source.incarnation ||
        !deployCondition(state, playerId, effect)
      )
        break;
      if (effect.as === 'unit-or-upgrade' && target) {
        if (!canAttach(state, card, target)) break;
        card.deployedAs = 'upgrade';
        attach(state, card, target);
      } else {
        if (
          effect.as === 'unit-or-upgrade' &&
          !(intent?.kind === 'choose-mode' && intent.mode === 'deploy-unit')
        )
          break;
        card.deployedAs = 'unit';
        card.exhausted = false;
        move(state, card, unitProfile(cardDefinition(state, card.cardId)).arena);
      }

      recordUnitEntry(state, card);
      fact(state, 'deployed', playerId, [card]);
      collectTriggers(state, 'deployed', [card]);
      collectTriggers(
        state,
        'leader-deployed',
        abilitySources(state).filter(observer => observer.controller === playerId),
        card,
      );
      offerPlot(state, card);
      maintenance(state);
      break;
    }
    default: {
      const unsupported: never = effect;
      throw new Error(`Unsupported effect: ${String(unsupported)}`);
    }
  }
}

function regroupFrames(state: GameState, extraRemaining?: number): Frame[] {
  const playerId = state.initiative.holder;
  return [
    { kind: 'begin-regroup' },
    { kind: 'regroup-delayed' },
    { kind: 'flush-triggers' },
    { kind: 'draw', players: [...state.seats], count: 2 },
    { kind: 'flush-triggers' },
    { kind: 'resource', playerId, setup: false },
    { kind: 'resource', playerId: opponent(state, playerId), setup: false },
    { kind: 'ready' },
    { kind: 'flush-triggers' },
    { kind: 'expire-phase' },
    { kind: 'flush-triggers' },
    { kind: 'finish-regroup', ...(extraRemaining === undefined ? {} : { extraRemaining }) },
  ];
}
function finishAction(state: GameState, playerId: string, passed: boolean, extraActions = 0) {
  if (state.actionHistory)
    state.phaseHistory.lastActions[playerId] = {
      basesAttacked: [...state.actionHistory.basesAttacked],
    };
  state.actionHistory = null;
  state.phaseHistory.actionsTaken[playerId] = (state.phaseHistory.actionsTaken[playerId] ?? 0) + 1;
  state.consecutivePasses = passed
    ? state.lastPassPlayer && state.lastPassPlayer !== playerId
      ? 2
      : 1
    : 0;
  state.lastPassPlayer = passed ? playerId : null;
  if (state.consecutivePasses === 2) {
    state.activePlayer = state.initiative.holder;
    state.execution.frames.push(
      { kind: 'expire-phase' },
      { kind: 'flush-triggers' },
      ...regroupFrames(state),
    );
  } else {
    state.activePlayer = extraActions > 0 ? playerId : opponent(state, playerId);
    state.execution.frames.push({
      kind: 'action',
      ...(extraActions > 1 ? { extraActions: extraActions - 1 } : {}),
    });
  }
}

function prompt(state: GameState, frame: Frame, playerId: string, kind: Decision['kind']) {
  const selection = frameSelection(state, frame, playerId);
  state.execution.decision = {
    id: allocateId(state, 'd'),
    playerId,
    kind,
    selection,
    options: frameIntents(state, frame).map((intent, index) => ({ id: `o${index}`, intent })),
  };
}

// Run only deterministic internal steps; stop at explicit data suspensions.
// No closure, timer, or random generator is captured by an execution frame.
export function settle(state: GameState): void {
  let steps = 0;
  while (state.phase !== 'ended' && !state.execution.decision && !state.execution.random) {
    reconcilePrintedStats(state);
    if (++steps > 1000) throw new Error('Crossfire resolution limit reached');
    if (!state.playPayment) collectDepartureEffects(state);
    prioritizeUpgradeDefeat(state);
    const frame = state.execution.frames[0];
    if (!frame) throw new Error('Crossfire execution has no continuation');
    if (
      frame.kind === 'random-bottom' ||
      frame.kind === 'random-card' ||
      frame.kind === 'random-discard' ||
      frame.kind === 'first-player' ||
      frame.kind === 'shuffle' ||
      frame.kind === 'search-shuffle'
    ) {
      state.execution.random = { id: allocateId(state, 'r'), bounds: randomBounds(state, frame) };
      break;
    }
    if (frame.kind === 'capture-pairs' || frame.kind === 'attack-series') {
      const intents = sequenceIntents(state, frame);
      if (intents.some(i => i.kind === 'target')) {
        prompt(state, frame, frame.playerId, 'effect');
        break;
      }
      state.execution.frames.shift();
      if (frame.kind === 'capture-pairs') {
        assertSequence(state, frame);
        capturePairs(
          state,
          frame.pairs.map(p => ({
            guard: instance(state, p.guard.instanceId),
            prisoner: instance(state, p.prisoner.instanceId),
          })),
          frame.playerId,
          frame.source,
        );
        maintenance(state);
      }
      continue;
    }
    if (frame.kind === 'unit-defeat') {
      while (frame.pending.length && !unitDefeatChoice(state, frame)) frame.pending.shift();
      const card = unitDefeatChoice(state, frame);
      if (card) {
        prompt(state, frame, card.controller, 'replacement');
        break;
      }
      state.execution.frames.shift();
      const cards = frame.cards
        .map(c => state.cards[c.instanceId]!)
        .filter((c, i) => c.incarnation === frame.cards[i]!.incarnation && isUnit(state, c));
      defeatUnits(state, cards, frame.combatDamaged, frame.source, true, frame.prepared);
      maintenance(state);
      continue;
    }
    if (frame.kind === 'upgrade-defeat') {
      prompt(state, frame, frame.card.controller, 'replacement');
      break;
    }
    if (frame.kind === 'convert-pilot') {
      state.execution.frames.shift();
      const pilot = state.cards[frame.pilot.instanceId]!,
        host = state.cards[frame.host.instanceId]!;
      if (
        pilot.incarnation === frame.pilot.incarnation &&
        isUnit(state, pilot) &&
        host.incarnation === frame.host.incarnation &&
        isUnit(state, host)
      )
        finishPilotAttachment(state, pilot, host, frame.source, frame.restriction);
      maintenance(state);
      continue;
    }
    if (frame.kind === 'create-tokens') {
      if (tokenReplacementSources(state, frame).length) {
        prompt(state, frame, frame.creator, 'replacement');
        break;
      }
      state.execution.frames.shift();
      const damage = frame.simultaneousDamage,
        unit = damage && state.cards[damage.target.instanceId];
      if (damage && unit && isUnit(state, unit) && unit.incarnation === damage.target.incarnation) {
        dealDamage(state, [{ target: unit, amount: damage.amount }], frame.playerId, frame.source);
        const pending = state.execution.frames[0]!;
        if (pending.kind !== 'damage') throw new Error('Missing compound damage');
        pending.tokens = frame;
      } else {
        commitTokenCreation(state, frame);
        maintenance(state);
      }
      continue;
    }
    if (frame.kind === 'combat-order') {
      prompt(state, frame, frame.playerId, 'effect');
      break;
    }
    if (frame.kind === 'optional-trigger') {
      prompt(state, frame, frame.trigger.playerId, 'effect');
      break;
    }
    if (frame.kind === 'unit-tax') {
      prompt(state, frame, frame.chooser, 'effect');
      break;
    }
    if (frame.kind === 'exploit-play') {
      state.execution.frames.shift();
      const payment = state.playPayment!;
      if (payment.stage === 'defeats') {
        payment.stage = 'credits';
        state.execution.frames.unshift(frame);
        defeatUnits(
          state,
          payment.selected.map(c => instance(state, c.instanceId)),
          [],
          payment.source,
        );
        maintenance(state);
      } else {
        payment.remaining = exploitCost(state);
        if (!canFinishExploit(state)) rollbackExploit(state);
        else if (payment.remaining > 0 && alternativePayments(state, payment.playerId).length) {
          state.execution.frames.unshift({
            kind: 'credit-payment',
            playerId: payment.playerId,
            amount: resourcePayment(state, payment.playerId, payment.remaining),
            intent: { kind: 'accept-effect' },
            selections: [],
            continuation: frame,
          });
        } else applyIntent(state, { kind: 'accept-effect' }, [], frame, payment.playerId, 0);
      }
      continue;
    }
    if (
      frame.kind === 'free-play-choice' ||
      frame.kind === 'credit-payment' ||
      frame.kind === 'ability-payment' ||
      frame.kind === 'exploit-payment'
    ) {
      prompt(state, frame, frame.playerId, 'effect');
      break;
    }
    if (frame.kind === 'disclose') {
      prompt(state, frame, frame.chooser, 'effect');
      break;
    }
    if (frame.kind === 'plot-reveal') {
      prompt(state, frame, frame.playerId, 'effect');
      break;
    }
    if (frame.kind === 'allocate-benefit') {
      prompt(state, frame, frame.playerId, 'effect');
      break;
    }
    if (frame.kind === 'zone-search') {
      prompt(state, frame, frame.playerId, 'search');
      break;
    }
    if (frame.kind === 'zone-inspection' || frame.kind === 'allocate-damage') {
      prompt(
        state,
        frame,
        frame.kind === 'zone-inspection' ? frame.chooser : frame.playerId,
        'effect',
      );
      break;
    }
    if (frame.kind === 'allocate-indirect') {
      prompt(state, frame, frame.assigner, 'effect');
      break;
    }
    if (frame.kind === 'arrange-deck') {
      prompt(state, frame, frame.playerId, 'effect');
      break;
    }
    if (frame.kind === 'search') {
      prompt(state, frame, searchOwner(state, frame), 'search');
      break;
    }
    if (frame.kind === 'damage') {
      const choice = damagePreventionChoice(state, frame);
      if (!choice) {
        const routing = excessDamageChoice(state, frame);
        if (routing) {
          if (routing.targets.length) {
            prompt(state, frame, routing.route.source.controller, 'effect');
            break;
          }
          finishExcessRouting(state, frame);
        }
        state.execution.frames.shift();
        const upgraded = frame.tokens ? commitTokenCreation(state, frame.tokens, true) : [];
        const result = applyDamage(state, frame);
        const friendlyDamaged = frame.after
          ? result.unitDamage.filter(
              d => state.cards[d.target.instanceId]?.controller === frame.after!.playerId,
            ).length
          : 0;
        for (const unit of upgraded) collectTriggers(state, 'upgrades-attached', [unit]);
        maintenance(state, frame.combatAttackId ? result.damaged : [], result.sacrificed);
        if (!state.result && frame.after)
          state.execution.frames.unshift(
            ...effectFrames(frame.after.playerId, frame.after.source, frame.after.effects, {
              ...frame.after,
              groups: {
                ...frame.after.groups,
                'damaged-units': [
                  ...new Map(result.damaged.map(ref => [ref.instanceId, ref])).values(),
                ],
              },
              values: {
                ...frame.after.values,
                'base-damage': result.baseDamage,
                'friendly-units-damaged': friendlyDamaged,
                'damage-dealt':
                  result.baseDamage + result.unitDamage.reduce((n, d) => n + d.amount, 0),
              },
            }),
          );
        if (!state.result)
          for (const event of result.unitDamage) {
            const ref = event.target;
            const survivor = state.cards[ref.instanceId];
            if (!survivor || !isUnit(state, survivor) || survivor.incarnation !== ref.incarnation)
              continue;
            for (const observer of result.observers.filter(
              o => o.source.controller === survivor.controller,
            ))
              collectTriggers(state, 'friendly-damage-survived', [observer.source], survivor, {
                origins: observer.origins,
                values: { damage: event.amount },
              });
          }
      } else if (choice.options.length === 1 && choice.mandatory) {
        reservePrevention(choice.assignment, choice.options[0]!);
      } else {
        prompt(state, frame, choice.target.controller, 'replacement');
        break;
      }
      continue;
    }
    if (frame.kind === 'mulligan' || frame.kind === 'resource') {
      if (frame.kind === 'resource' && frame.queuedResources) {
        if (validResourcePlan(state, frame)) {
          state.execution.frames.shift();
          applyIntent(
            state,
            { kind: 'resource' },
            frame.queuedResources.map(c => c.instanceId),
            frame,
            frame.playerId,
          );
          continue;
        }
        // A preceding effect changed the hand. Ask again using current choices.
        delete frame.queuedResources;
      }
      prompt(state, frame, frame.playerId, frame.kind);
      break;
    }
    if (
      frame.kind === 'unique' ||
      frame.kind === 'trigger-batch' ||
      frame.kind === 'effect' ||
      frame.kind === 'delayed-batch'
    ) {
      const intents = frameIntents(state, frame);
      if (
        frame.kind === 'effect' &&
        ((frame.effect.kind === 'select-upgrades' && frame.effect.min === 'all') ||
          (frame.effect.kind === 'select-unit' &&
            frame.effect.allowMissing === true &&
            !matchingUnits(state, frame.playerId, frame.effect.filter, frame).length) ||
          frame.effect.kind === 'restrict-play' ||
          frame.effect.kind === 'restrict-named-card' ||
          frame.effect.kind === 'take-control-upgrade' ||
          frame.effect.kind === 'create-credits' ||
          frame.effect.kind === 'disclose' ||
          frame.effect.kind === 'inspect-zone' ||
          frame.effect.kind === 'search-zones' ||
          frame.effect.kind === 'grant-discard-play' ||
          frame.effect.kind === 'schedule-return' ||
          frame.effect.kind === 'schedule-next-action' ||
          (frame.effect.kind === 'resource-top' && !frame.effect.optional) ||
          frame.effect.kind === 'tax-units' ||
          frame.effect.kind === 'exhaust-group' ||
          frame.effect.kind === 'capture-pairs' ||
          frame.effect.kind === 'attack-series' ||
          frame.effect.kind === 'capture-group' ||
          frame.effect.kind === 'capture-unit' ||
          frame.effect.kind === 'distribute' ||
          frame.effect.kind === 'random-card' ||
          frame.effect.kind === 'reveal-card' ||
          frame.effect.kind === 'token-and-damage' ||
          frame.effect.kind === 'heal-units' ||
          frame.effect.kind === 'random-discard' ||
          frame.effect.kind === 'discard-random-hand' ||
          frame.effect.kind === 'repeat-defeated-batch' ||
          frame.effect.kind === 'repeat-defeated-ability' ||
          frame.effect.kind === 'repeat-attack-ability' ||
          frame.effect.kind === 'repeat-played-ability' ||
          frame.effect.kind === 'schedule-phase-trigger' ||
          frame.effect.kind === 'exhaust-units' ||
          frame.effect.kind === 'ready-units' ||
          frame.effect.kind === 'units-damage-target' ||
          frame.effect.kind === 'repeat-bounty' ||
          frame.effect.kind === 'use-played-abilities' ||
          frame.effect.kind === 'use-defeated-ability' ||
          frame.effect.kind === 'schedule-regroup-victory' ||
          [
            'exchange-control',
            'after-attack',
            'resource-departed',
            'schedule-regroup-operation',
          ].includes(frame.effect.kind) ||
          frame.effect.kind === 'prevent-base-healing' ||
          frame.effect.kind === 'extra-action' ||
          frame.effect.kind === 'bottom-hand' ||
          frame.effect.kind === 'reveal-deck-cards' ||
          frame.effect.kind === 'bottom-deck-group' ||
          frame.effect.kind === 'reveal-top' ||
          frame.effect.kind === 'reveal-hand' ||
          frame.effect.kind === 'resource-cards' ||
          frame.effect.kind === 'schedule-resource-repayment' ||
          frame.effect.kind === 'flip-leader' ||
          frame.effect.kind === 'draw-card' ||
          frame.effect.kind === 'move-cards' ||
          frame.effect.kind === 'move-card' ||
          frame.effect.kind === 'defeat-resource' ||
          frame.effect.kind === 'mill' ||
          frame.effect.kind === 'divide-damage' ||
          frame.effect.kind === 'move-upgrades' ||
          frame.effect.kind === 'gain-force' ||
          (frame.effect.kind === 'indirect-damage' && frame.effect.recipient !== 'chosen') ||
          frame.effect.kind === 'modify-units' ||
          frame.effect.kind === 'phase-stat-modifier' ||
          frame.effect.kind === 'with-value' ||
          frame.effect.kind === 'damage-target' ||
          frame.effect.kind === 'create-unit' ||
          frame.effect.kind === 'defeat-group' ||
          frame.effect.kind === 'defeat-bound' ||
          frame.effect.kind === 'return-unit-with-upgrades' ||
          frame.effect.kind === 'return-bound' ||
          frame.effect.kind === 'damage-bound' ||
          frame.effect.kind === 'defeat-self-upgrade' ||
          frame.effect.kind === 'if' ||
          frame.effect.kind === 'heal-target' ||
          frame.effect.kind === 'prevent-next-base-damage' ||
          frame.effect.kind === 'exhaust-bound' ||
          frame.effect.kind === 'on-unit' ||
          frame.effect.kind === 'each-unit' ||
          frame.effect.kind === 'damage-bases' ||
          (frame.effect.kind === 'deploy' && (frame.effect.as === 'unit' || !intents.length)) ||
          frame.effect.kind === 'give-self-token' ||
          frame.effect.kind === 'search-deck' ||
          frame.effect.kind === 'look-deck' ||
          frame.effect.kind === 'heal-own-base' ||
          frame.effect.kind === 'next-play' ||
          frame.effect.kind === 'grant-keyword-until-source-leaves' ||
          frame.effect.kind === 'phase-play-cost' ||
          frame.effect.kind === 'damage-defender' ||
          frame.effect.kind === 'draw-cards' ||
          frame.effect.kind === 'damage-own-base' ||
          frame.effect.kind === 'defeat-units' ||
          frame.effect.kind === 'defeat-defender-shields' ||
          (frame.effect.kind === 'damage-units' &&
            (frame.effect.max === undefined ||
              numericValue(state, frame, frame.effect.max) <= 0 ||
              !matchingUnits(state, frame.playerId, frame.effect.filter, frame).length)) ||
          (frame.effect.kind === 'self-resource' && frame.effect.optional === false))
      ) {
        state.execution.frames.shift();
        applyEffect(state, frame);
        continue;
      }
      if (!intents.length || (intents.length === 1 && intents[0]!.kind === 'decline-effect')) {
        state.execution.frames.shift();
        if (
          frame.kind === 'effect' &&
          (frame.effect.kind === 'select-unit' ||
            frame.effect.kind === 'play-card' ||
            frame.effect.kind === 'pay') &&
          frame.effect.otherwise
        )
          applyEffect(state, frame, { kind: 'decline-effect' });
        continue;
      }
      if (
        frame.kind === 'trigger-batch' &&
        intents.length === 1 &&
        intents[0]!.kind === 'trigger'
      ) {
        state.execution.frames.shift();
        resolveTrigger(state, frame, intents[0]!.triggerId);
        continue;
      }
      if (
        frame.kind === 'delayed-batch' &&
        intents.length === 1 &&
        intents[0]!.kind === 'delayed'
      ) {
        state.execution.frames.shift();
        resolveDelayed(state, frame, intents[0]!.effectId);
        continue;
      }
      const context = decisionContext(state, frame)!;
      prompt(state, frame, context.playerId, context.kind);
      break;
    }
    if (frame.kind === 'action') {
      if (!(state.initiative.claimed && state.initiative.holder === state.activePlayer)) {
        prompt(state, frame, state.activePlayer, 'action');
        break;
      }
      state.execution.frames.shift();
      finishAction(state, state.activePlayer, true, frame.extraActions);
      continue;
    }
    state.execution.frames.shift();
    switch (frame.kind) {
      case 'queue-triggers':
        state.execution.pendingTriggers.push(...frame.triggers);
        break;
      case 'expire-round':
        state.lastingEffects = state.lastingEffects.filter(e => e.expires.kind !== 'round');
        maintenance(state);
        break;
      case 'finish-regroup': {
        const remaining =
          frame.extraRemaining ??
          abilitySources(state).reduce(
            (sum, card) => sum + (effectiveAbilities(state, card).extraRegroups ?? 0),
            0,
          );
        if (remaining > 0) state.execution.frames.push(...regroupFrames(state, remaining - 1));
        else
          state.execution.frames.push(
            { kind: 'expire-round' },
            { kind: 'flush-triggers' },
            { kind: 'begin-action' },
          );
        break;
      }
      case 'expire-phase':
        state.phaseTriggers = [];
        state.namedEffects = state.namedEffects.filter(effect => effect.expires.kind !== 'phase');
        state.playModifiers = [];
        state.playRestrictions = [];
        state.grantedPlays = [];
        state.phaseStatModifiers = [];
        state.lastingEffects = state.lastingEffects.filter(
          e =>
            e.expires.kind !== 'phase' &&
            !(
              e.expires.kind === 'next-regroup' &&
              state.phase === 'regroup' &&
              e.expires.round === state.round
            ),
        );
        maintenance(state);
        break;
      case 'begin-regroup':
        state.playModifiers = [];
        state.playRestrictions = [];
        state.grantedPlays = [];
        state.phaseStatModifiers = [];
        state.phase = 'regroup';
        state.phaseHistory = emptyPhaseHistory();
        collectTriggers(state, 'regroup-start', abilitySources(state));
        maintenance(state);
        break;
      case 'regroup-delayed':
        // The captured phase-start abilities wait behind delayed effects (§7.7.4b).
        collectRegroupEffects(state);
        break;
      case 'finish-searched-play': {
        const card = state.cards[frame.target.instanceId]!;
        if (
          card.zone === 'deck' &&
          card.incarnation === frame.target.incarnation &&
          state.searching.includes(card.instanceId)
        ) {
          state.searching.splice(state.searching.indexOf(card.instanceId), 1);
          state.players[card.owner]!.deck.push(card.instanceId);
          card.visibility++;
        }
        break;
      }
      case 'flush-triggers':
        flushTriggers(state);
        break;
      case 'begin-action':
        state.playModifiers = [];
        state.playRestrictions = [];
        state.grantedPlays = [];
        state.phaseStatModifiers = [];
        state.phase = 'action';
        state.phaseHistory = emptyPhaseHistory();
        state.round++;
        state.roundHistory = { plays: [], triggerUses: [], actionUses: [] };
        state.activePlayer = state.initiative.holder;
        state.initiative.claimed = false;
        state.consecutivePasses = 0;
        state.lastPassPlayer = null;
        fact(state, 'round', state.activePlayer, [], state.round);
        collectTriggers(state, 'action-start', abilitySources(state));
        collectActionEffects(state);
        state.execution.frames.push({ kind: 'flush-triggers' }, { kind: 'action' });
        break;
      case 'draw':
        draw(state, frame.players, frame.count);
        break;
      case 'ready':
        readyInPlay(
          state,
          Object.values(state.cards).filter(
            card => card.zone === 'base' || card.zone === 'resources' || isArena(card.zone),
          ),
          true,
        );
        fact(state, 'readied');
        break;
      case 'end-attack': {
        const attack = state.attacks.pop();
        if (!attack || attack.id !== frame.attackId) throw new Error('Invalid attack completion');
        state.lastingEffects = state.lastingEffects.filter(
          e => e.expires.kind !== 'attack' || e.expires.attackId !== attack.id,
        );
        maintenance(state);
        if (state.result) break;
        for (const ref of [attack.attacker, attack.defender]) {
          const unit = state.cards[ref.instanceId];
          if (
            unit &&
            isUnit(state, unit) &&
            unit.incarnation === ref.incarnation &&
            !attack.removedFromCombat.some(
              removed =>
                removed.instanceId === ref.instanceId && removed.incarnation === ref.incarnation,
            )
          )
            collectTriggers(state, 'host-combat-ended', attachedUpgrades(state, unit), undefined, {
              bindings: { attacker: attack.attacker, defender: attack.defender },
            });
        }
        if (attack.ending) {
          const source = attack.ending.source;
          const damage = attack.combatDamage.filter(
            d =>
              d.source.instanceId === attack.attacker.instanceId &&
              d.source.incarnation === attack.attacker.incarnation,
          );
          const combatValues = {
            survived: Number(
              isUnit(state, state.cards[source.instanceId]!) &&
                state.cards[source.instanceId]!.incarnation === source.incarnation,
            ),
            'defender-defeated': Number(
              attack.defeated.some(
                r =>
                  r.instanceId === attack.defender.instanceId &&
                  r.incarnation === attack.defender.incarnation,
              ),
            ),
            'combat-base-damage': damage
              .filter(d => cardDefinition(state, d.target.cardId).kind === 'base')
              .reduce((n, d) => n + d.amount, 0),
            'combat-opponent-base-damage': damage
              .filter(
                d =>
                  cardDefinition(state, d.target.cardId).kind === 'base' &&
                  state.cards[d.target.instanceId]!.controller !== source.controller,
              )
              .reduce((n, d) => n + d.amount, 0),
          };
          for (const observer of attack.ending.observers)
            collectTriggers(state, 'friendly-attack-ended', [observer.source], source, {
              origins: observer.origins,
              bindings: { defender: attack.defender },
              values: combatValues,
            });
          collectTriggers(state, 'attack-ended', [source], undefined, {
            origins: attack.ending.abilities,
            bindings: { defender: attack.defender },
            groups: {
              'combat-units': damage
                .filter(
                  d =>
                    cardDefinition(state, d.target.cardId).kind === 'unit' &&
                    !unitIsLeader(state, d.target),
                )
                .map(d => d.target),
            },
            values: combatValues,
          });
        }
        if (attack.after?.length)
          state.execution.frames.unshift(
            { kind: 'flush-triggers' },
            ...attack.after.map(frame => ({
              ...frame,
              values: {
                ...frame.values,
                'attacker-damaged-base': Number(
                  attack.baseDamageSources.some(
                    r =>
                      r.instanceId === attack.attacker.instanceId &&
                      r.incarnation === attack.attacker.incarnation,
                  ),
                ),
              },
            })),
          );
        fact(state, 'attack-ended', null, [attack.attacker, attack.defender]);
        break;
      }
      case 'combat-response': {
        const attack = state.attacks.find(a => a.id === frame.attackId);
        if (!attack) throw new Error('Missing combat response attack');
        const attacker = instance(state, attack.attacker.instanceId),
          defender = instance(state, attack.defender.instanceId);
        if (
          inCombat(state, attack, attacker, attack.attacker) &&
          inCombat(state, attack, defender, attack.defender)
        ) {
          if (attack.order === 'defender-first')
            dealDamage(
              state,
              attackingAssignments(state, attack),
              attacker.controller,
              attacker,
              attack.id,
            );
          else
            dealDamage(
              state,
              [
                {
                  target: attacker,
                  amount: combatAmount(state, attack, defender),
                  source: defender,
                },
              ],
              defender.controller,
              defender,
              attack.id,
            );
        }
        break;
      }
      case 'combat': {
        const attack = state.attacks.find(a => a.id === frame.attackId);
        if (!attack) throw new Error('Missing attack');
        const attacker = instance(state, attack.attacker.instanceId),
          defender = instance(state, attack.defender.instanceId);
        if (!inCombat(state, attack, attacker, attack.attacker)) break;
        const orderFrame = {
          kind: 'combat-order' as const,
          attackId: attack.id,
          playerId: attacker.controller,
          source: structuredClone(attacker),
        };
        if (!attack.order && combatOrderIntents(state, orderFrame).length) {
          state.execution.frames.unshift(orderFrame, frame);
          break;
        }
        attack.ending = {
          source: structuredClone(attacker),
          abilities: abilityOrigins(state, attacker),
          observers: triggerObservers(state, 'friendly-attack-ended', attacker.controller),
        };
        const unitDefender = inCombat(state, attack, defender, attack.defender);
        if (unitDefender && attack.order === 'defender-first') {
          state.execution.frames.unshift({ kind: 'combat-response', attackId: attack.id });
          dealDamage(
            state,
            [{ target: attacker, amount: combatAmount(state, attack, defender), source: defender }],
            defender.controller,
            defender,
            attack.id,
          );
          break;
        }
        const assignments = attackingAssignments(state, attack);
        const first =
          attack.order === 'attacker-first' ||
          (attack.order === undefined &&
            (attack.attackerFirst || effectiveAbilities(state, attacker).firstCombatDamage));
        if (unitDefender && first)
          state.execution.frames.unshift({ kind: 'combat-response', attackId: attack.id });
        if (unitDefender && !first)
          assignments.push({
            target: attacker,
            amount: combatAmount(state, attack, defender),
            source: defender,
          });
        dealDamage(state, assignments, attacker.controller, attacker, attack.id);
        break;
      }
      case 'finish-action':
        finishAction(state, frame.playerId, frame.passed, frame.extraActions);
        break;
    }
  }
}

function acceptRandom(state: GameState, input: Extract<EngineInput, { type: 'random' }>) {
  const request = state.execution.random,
    frame = state.execution.frames[0];
  if (
    !request ||
    input.requestId !== request.id ||
    !frame ||
    input.values.length !== request.bounds.length ||
    input.values.some((n, i) => n >= request.bounds[i]!)
  )
    throw new IllegalInput();
  state.execution.random = null;
  if (frame.kind === 'first-player') {
    prompt(state, frame, state.seats[input.values[0]!]!, 'initiative');
  } else if (frame.kind === 'random-bottom') {
    const cards = [...frame.cards];
    for (let n = cards.length - 1, i = 0; n > 0; n--, i++) {
      const chosen = input.values[i]!;
      [cards[n], cards[chosen]] = [cards[chosen]!, cards[n]!];
    }
    const deck = state.players[frame.owner]!.deck;
    for (const ref of cards) {
      const c = instance(state, ref.instanceId);
      deck.splice(deck.indexOf(c.instanceId), 1);
      deck.push(c.instanceId);
      c.visibility++;
    }
    fact(state, 'put-on-deck', frame.owner, [], cards.length);
    state.execution.frames.shift();
  } else if (frame.kind === 'random-card') {
    state.execution.frames.shift();
    resolveRandomCard(state, frame, input.values[0]!);
  } else if (frame.kind === 'random-discard') {
    assertRandomDiscard(state, frame);
    const card = instance(state, frame.cards[input.values[0]!]!.instanceId);
    state.execution.frames.shift();
    discardCards(state, [card], frame.owner, frame.source);
  } else if (frame.kind === 'search-shuffle') {
    state.execution.frames.shift();
    finishSearch(state, frame, input.values);
  } else if (frame.kind === 'shuffle') {
    const deck = state.players[frame.playerId]!.deck;
    for (let n = deck.length - 1, i = 0; n > 0; n--, i++) {
      const chosen = input.values[i]!;
      [deck[n], deck[chosen]] = [deck[chosen]!, deck[n]!];
    }
    for (const id of deck) instance(state, id).visibility++;
    fact(state, 'shuffled', frame.playerId);
    state.execution.frames.shift();
  } else throw new IllegalInput();
}

function resolveDelayed(
  state: GameState,
  batch: Extract<Frame, { kind: 'delayed-batch' }>,
  id: string,
) {
  const effect = batch.effects.find(effect => effect.id === id);
  if (!effect) throw new IllegalInput();
  const remaining = batch.effects.filter(effect => effect.id !== id);
  if (remaining.length)
    state.execution.frames.unshift({ ...batch, effects: remaining, playerId: effect.playerId });
  if (effect.kind === 'resources-at-regroup' || effect.kind === 'resources-at-action') {
    fact(state, 'delayed-resolved', effect.playerId, [effect.source], effect.amount);
    state.execution.frames.unshift(
      ...effectFrames(
        effect.playerId,
        effect.source,
        [
          {
            kind: 'select-resources',
            player: 'self',
            exhausted: 'any',
            min: effect.amount,
            max: effect.amount,
            operation: 'defeat',
          },
        ],
        effect.origin ? { origin: effect.origin } : undefined,
      ),
    );
    return;
  }
  if (effect.kind === 'victory-at-regroup') {
    fact(state, 'delayed-resolved', effect.playerId, [effect.source]);
    const units = state[effect.arena]
      .map(id => instance(state, id))
      .filter(card => isUnit(state, card));
    if (
      units.some(unit => unit.controller === effect.playerId) &&
      units.every(unit => unit.controller === effect.playerId)
    )
      endGame(state, effect.playerId, 'card-effect', effect.source);
    return;
  }
  if (effect.kind === 'effects-at-action') {
    fact(state, 'delayed-resolved', effect.playerId, [effect.source]);
    state.execution.frames.unshift(...effectFrames(effect.playerId, effect.source, effect.effects));
    return;
  }
  const unit = instance(state, effect.target.instanceId);
  fact(state, 'delayed-resolved', effect.playerId, [effect.source, effect.target]);
  if (effect.kind === 'regroup-operation') {
    if (
      unit.incarnation === effect.target.incarnation &&
      (isUnit(state, unit) || isUpgrade(state, unit))
    ) {
      if (effect.operation === 'bottom') {
        fact(state, 'put-on-deck', effect.playerId, [effect.source, unit]);
        move(state, unit, 'deck');
      } else if (isUnit(state, unit)) defeatUnits(state, [unit], [], effect.source);
      else defeatUpgrade(state, unit);
      maintenance(state);
    }
    return;
  }
  if (effect.kind === 'rescue-at-regroup') {
    if (unit.incarnation === effect.target.incarnation && unit.zone === 'captured')
      rescueCaptured(state, unit);
    maintenance(state);
    return;
  }
  if (
    unit.incarnation === effect.target.incarnation &&
    (isUnit(state, unit) ||
      (isUpgrade(state, unit) &&
        (effect.kind === 'control-at-regroup' || effect.kind === 'control-on-departure')))
  ) {
    if (effect.kind === 'control-at-regroup' || effect.kind === 'control-on-departure') {
      if (
        (unitIsLeader(state, unit) || cardDefinition(state, unit.cardId).kind === 'leader') &&
        unit.controller !== unit.owner &&
        !effectiveAbilities(state, unit).cannotChangeController
      )
        isUnit(state, unit) ? defeatUnits(state, [unit]) : defeatUpgrade(state, unit);
      else changeControl(state, unit, unit.owner);
      maintenance(state);
    } else if (effect.kind === 'defeat-at-regroup') {
      defeatUnits(state, [unit], [], effect.source);
      maintenance(state);
    } else
      state.execution.frames.unshift(
        ...effectFrames(
          effect.playerId,
          effect.source,
          [{ kind: 'on-unit', target: 'returned', operation: { kind: 'return-to-hand' } }],
          { bindings: { returned: effect.target } },
        ),
      );
  }
}

function applyIntent(
  state: GameState,
  intent: Intent,
  selections: string[],
  frame: Frame,
  actor: string,
  credit?: number,
  costSelections?: string[],
  unitPayment = 0,
) {
  if (frame.kind === 'capture-pairs') {
    if (intent.kind !== 'target') throw new IllegalInput();
    const selected = reference(instance(state, intent.card));
    if (frame.chosenGuard) {
      frame.pairs.push({ guard: frame.chosenGuard, prisoner: selected });
      frame.chosenGuard = null;
    } else frame.chosenGuard = selected;
    state.execution.frames.unshift(frame);
    return;
  }
  if (frame.kind === 'attack-series') {
    if (intent.kind === 'decline-effect') return;
    if (intent.kind !== 'target') throw new IllegalInput();
    const selected = reference(instance(state, intent.card));
    frame.used.push(selected);
    state.execution.frames.unshift(
      ...effectFrames(
        frame.playerId,
        frame.source,
        [
          {
            kind: 'attack-bound',
            target: 'series-attacker',
            optional: false,
            unitsOnly: frame.unitsOnly,
            evenIfExhausted: frame.evenIfExhausted,
          },
        ],
        { ...frame, bindings: { ...frame.bindings, 'series-attacker': selected } },
      ),
      { kind: 'flush-triggers' },
      frame,
    );
    return;
  }
  if (frame.kind === 'free-play-choice') {
    if (intent.kind === 'decline-effect') {
      rollbackExploit(state);
      return;
    }
    const payment = state.playPayment!;
    if (
      intent.kind !== 'choose-mode' ||
      !payment.freeOffer ||
      !['play-for-free', 'pay-cost'].includes(intent.mode) ||
      (intent.mode === 'pay-cost' && !payment.freeOffer.normal)
    )
      throw new IllegalInput();
    payment.freeOffer.choice = intent.mode === 'play-for-free' ? 'free' : 'normal';
    if (payment.freeOffer.choice === 'free') payment.remaining = 0;
    payment.stage = payment.maximum ? 'units' : 'defeats';
    state.execution.frames.unshift({
      kind: payment.maximum ? 'exploit-payment' : 'exploit-play',
      playerId: actor,
    });
    return;
  }
  if (frame.kind === 'exploit-payment') {
    const payment = state.playPayment!;
    payment.selected = selections.map(id => structuredClone(instance(state, id)));
    payment.stage = 'defeats';
    state.execution.frames.unshift({ kind: 'exploit-play', playerId: actor });
    return;
  }
  if (frame.kind === 'exploit-play') {
    const payment = state.playPayment!;
    payment.stage = 'play';
    applyIntent(
      state,
      payment.intent,
      [],
      payment.continuation,
      actor,
      credit ?? 0,
      undefined,
      unitPayment,
    );
    return;
  }
  if (
    credit === undefined &&
    !state.playPayment &&
    intent.kind === 'play' &&
    (frame.kind === 'action' || frame.kind === 'effect')
  ) {
    const maximum = exploitForIntent(state, frame, intent, actor);
    const freeOffer = freePlayOffer(state, frame, intent, actor);
    if (maximum || freeOffer) {
      const saved = structuredClone(state);
      saved.execution.frames.unshift(frame);
      settle(saved);
      state.nextId = saved.nextId;
      const parts = { increased: 0, reductions: {} as Record<string, number> };
      const remaining = paymentAmount(state, frame, intent, actor, [], parts);
      const effect = declarationEffect(frame);
      const source = { ...structuredClone(instance(state, intent.card)), controller: actor };
      state.playPayment = {
        playerId: actor,
        source,
        intent,
        continuation: frame,
        stage: freeOffer ? 'free' : 'units',
        ...(freeOffer ? { freeOffer } : {}),
        maximum,
        ...parts,
        remaining,
        selected: [],
        rollback: JSON.stringify(stateSchema.parse(saved)),
        modifiers: matchingPlayModifiers(
          state,
          source,
          cardDefinition(state, source.cardId).kind === 'unit' && !intent.target,
          intent.smuggle ? 'smuggle' : effect?.using,
        ).map(m => m.id),
      };
      fact(state, 'revealed', actor, [source]);
      state.execution.frames.unshift({
        kind: freeOffer ? 'free-play-choice' : 'exploit-payment',
        playerId: actor,
      });
      return;
    }
  }
  if (frame.kind === 'credit-payment') {
    if (intent.kind !== 'accept-effect') throw new IllegalInput();
    let creditsSpent = 0,
      unitsSpent = 0;
    for (const id of selections) {
      const card = instance(state, id);
      if (card.cardId === 'credit') {
        defeatCredit(state, card, actor);
        creditsSpent++;
      } else {
        card.exhausted = true;
        unitsSpent++;
        fact(state, 'exhausted', actor, [card]);
      }
    }
    applyIntent(
      state,
      frame.intent,
      frame.selections,
      frame.continuation,
      actor,
      creditsSpent,
      undefined,
      unitsSpent,
    );
    return;
  }
  const payment = paymentAbility(state, frame, intent);
  if (
    costSelections === undefined &&
    payment &&
    chosenCardCost(payment.ability) &&
    (frame.kind === 'action' || frame.kind === 'effect')
  ) {
    state.execution.frames.unshift({
      kind: 'ability-payment',
      playerId: actor,
      source: structuredClone(payment.source),
      intent,
      continuation: frame,
    });
    return;
  }
  const amount = credit === undefined ? paymentAmount(state, frame, intent, actor, selections) : 0;
  if (
    amount > 0 &&
    alternativePayments(state, actor).length &&
    (frame.kind === 'action' ||
      frame.kind === 'effect' ||
      frame.kind === 'unit-tax' ||
      frame.kind === 'ability-payment')
  ) {
    if (intent.kind === 'play') fact(state, 'revealed', actor, [instance(state, intent.card)]);
    state.execution.frames.unshift({
      kind: 'credit-payment',
      playerId: actor,
      amount,
      intent,
      selections,
      continuation: frame,
    });
    return;
  }
  if (frame.kind === 'unit-defeat') {
    const card = unitDefeatChoice(state, frame);
    if (!card || (intent.kind !== 'target' && intent.kind !== 'decline-effect'))
      throw new IllegalInput();
    const host =
      intent.kind === 'target'
        ? defeatAttachmentTargets(state, card).find(c => c.instanceId === intent.card)
        : undefined;
    if (intent.kind === 'target' && !host) throw new IllegalInput();
    frame.pending.shift();
    state.execution.frames.unshift(frame);
    if (host) {
      fact(state, 'unit-defeat-replaced', card.controller, [card]);
      attachPilot(state, card, host, card, defeatAttachmentFilter);
    }
    maintenance(state);
    return;
  }
  if (frame.kind === 'upgrade-defeat') {
    if (intent.kind !== 'accept-effect' && intent.kind !== 'decline-effect')
      throw new IllegalInput();
    resolveUpgradeDefeat(state, frame, intent.kind === 'accept-effect');
    maintenance(state);
    return;
  }
  if (frame.kind === 'create-tokens') {
    if (intent.kind === 'decline-effect') frame.declined = true;
    else if (intent.kind === 'target') {
      const card = state.cards[intent.card];
      if (!card || !tokenReplacementSources(state, frame).includes(card)) throw new IllegalInput();
      doubleTokenCreation(frame, card);
      state.execution.frames.unshift(frame);
      fact(state, 'token-creation-replaced', frame.creator, [frame.source, card]);
      defeatUnits(state, [card]);
      maintenance(state);
      return;
    } else throw new IllegalInput();
    state.execution.frames.unshift(frame);
    return;
  }
  if (frame.kind === 'combat-order') {
    const attack = state.attacks.find(a => a.id === frame.attackId);
    if (
      !attack ||
      intent.kind !== 'choose-mode' ||
      !combatOrderIntents(state, frame).some(
        i => i.kind === 'choose-mode' && i.mode === intent.mode,
      )
    )
      throw new IllegalInput();
    attack.order = intent.mode as NonNullable<Attack['order']>;
    fact(state, 'mode-chosen', actor, [frame.source]);
    return;
  }
  if (frame.kind === 'optional-trigger') {
    if (intent.kind === 'accept-effect') resolveAcceptedTrigger(state, frame.trigger);
    return;
  }
  if (frame.kind === 'ability-payment') {
    applyIntent(
      state,
      frame.intent,
      [],
      frame.continuation,
      actor,
      credit ?? 0,
      selections,
      unitPayment,
    );
    return;
  }
  if (frame.kind === 'unit-tax') {
    applyUnitTax(state, frame, selections, (credit ?? 0) + unitPayment);
    return;
  }
  if (frame.kind === 'disclose') {
    if (intent.kind === 'accept-effect') {
      recordHandReveal(
        state,
        selections.map(id => instance(state, id)),
      );
      fact(
        state,
        'revealed',
        actor,
        selections.map(id => instance(state, id)),
      );
      state.execution.frames.unshift(
        ...effectFrames(frame.playerId, frame.source, frame.effect.effects, {
          ...frame,
          groups: {
            ...frame.groups,
            ...(frame.effect.group
              ? { [frame.effect.group]: selections.map(id => reference(instance(state, id))) }
              : {}),
          },
        }),
      );
    } else if (frame.effect.otherwise) {
      state.execution.frames.unshift(
        ...effectFrames(frame.playerId, frame.source, frame.effect.otherwise, frame),
      );
    }
    return;
  }
  if (frame.kind === 'plot-reveal') {
    const cards = selections.map(id => instance(state, id));
    if (cards.length) {
      fact(state, 'shown', actor, cards);
      state.facts.at(-1)!.mode = 'plot';
    }
    collectTriggers(state, 'leader-deployed', cards);
    return;
  }
  if (frame.kind === 'allocate-benefit') {
    if (frame.effect.benefit === 'damage') {
      const counts = new Map<string, number>();
      for (const id of selections) counts.set(id, (counts.get(id) ?? 0) + 1);
      state.execution.frames.unshift(
        ...effectFrames(frame.playerId, frame.source, frame.effect.effects, {
          ...frame,
          values: { ...frame.values, [frame.effect.bind]: selections.length },
        }),
      );
      // V8 §8.34.1a combines all "for each" damage into one instance.
      dealDamage(
        state,
        [...counts].map(([id, amount]) => ({ target: instance(state, id), amount })),
        frame.playerId,
        frame.source,
      );
      return;
    }
    if (frame.effect.benefit === 'advantage' || frame.effect.benefit === 'experience') {
      const counts = new Map<string, number>();
      for (const id of selections) counts.set(id, (counts.get(id) ?? 0) + 1);
      state.execution.frames.unshift(
        planTokenCreation(
          frame,
          {
            kind: 'upgrade',
            token: frame.effect.benefit,
            targets: [...counts].map(([id, count]) => ({
              target: reference(instance(state, id)),
              count,
            })),
          },
          { after: frame.effect.effects, countAs: frame.effect.bind },
        ),
      );
      return;
    }
    const amount = applyHealing(state, frame, selections);
    state.execution.frames.unshift(
      ...effectFrames(frame.playerId, frame.source, frame.effect.effects, {
        ...frame,
        values: { ...frame.values, [frame.effect.bind]: amount },
      }),
    );
    maintenance(state);
    return;
  }
  if (frame.kind === 'zone-search') {
    finishZoneSearch(state, frame, selections);
    return;
  }
  if (frame.kind === 'zone-inspection') {
    const selected = selections[0] && instance(state, selections[0]);
    const context = {
      ...frame,
      groups: {
        ...frame.groups,
        ...(frame.effect.group
          ? { [frame.effect.group]: selections.map(id => reference(instance(state, id))) }
          : {}),
      },
      bindings: {
        ...frame.bindings,
        ...(selected ? { [frame.effect.bind]: reference(selected) } : {}),
      },
    };
    state.execution.frames.unshift(
      ...(selected
        ? effectFrames(frame.playerId, frame.source, frame.effect.effects, context)
        : effectFrames(frame.playerId, frame.source, frame.effect.otherwise ?? [], frame)),
      ...effectFrames(frame.playerId, frame.source, frame.effect.after ?? [], frame),
    );
    return;
  }
  if (frame.kind === 'allocate-indirect' || frame.kind === 'allocate-damage') {
    if (intent.kind === 'decline-effect') return;
    const counts = new Map<string, number>();
    for (const id of selections) counts.set(id, (counts.get(id) ?? 0) + 1);
    if (!counts.size) {
      if (frame.after)
        state.execution.frames.unshift(
          ...effectFrames(frame.after.playerId, frame.after.source, frame.after.effects, {
            ...frame.after,
            values: { ...frame.after.values, 'damage-dealt': 0, 'base-damage': 0 },
          }),
        );
      return;
    }
    state.execution.frames.unshift({
      kind: 'damage',
      ...(frame.after ? { after: frame.after } : {}),
      actor: frame.playerId,
      assignments: [...counts].map(([id, amount]) => ({
        target: reference(instance(state, id)),
        amount,
        source: structuredClone(frame.source),
        preventedBy: null,
        unpreventable:
          frame.kind === 'allocate-indirect' || damageIsUnpreventable(state, frame.source),
        indirect: frame.kind === 'allocate-indirect',
      })),
    });
    return;
  }
  if (frame.kind === 'delayed-batch') {
    if (intent.kind === 'delayed-player')
      state.execution.frames.unshift({ ...frame, playerId: intent.playerId });
    else if (intent.kind === 'delayed') resolveDelayed(state, frame, intent.effectId);
    else throw new IllegalInput();
    return;
  }
  if (frame.kind === 'arrange-deck') {
    finishArrangeChoice(state, frame, intent, selections);
    return;
  }
  if (frame.kind === 'search') {
    if (intent.kind !== 'search') throw new IllegalInput();
    state.execution.frames.unshift({ ...frame, kind: 'search-shuffle', selected: [...selections] });
    return;
  }
  if (frame.kind === 'damage') {
    const choice = damagePreventionChoice(state, frame);
    if (!choice) {
      if (!excessDamageChoice(state, frame) || !['target', 'decline-effect'].includes(intent.kind))
        throw new IllegalInput();
      finishExcessRouting(
        state,
        frame,
        intent.kind === 'target' ? instance(state, intent.card) : undefined,
      );
      state.execution.frames.unshift(frame);
      return;
    }
    if (intent.kind === 'decline-effect' && !choice.mandatory)
      choice.assignment.preventionDeclined = true;
    else if (intent.kind === 'target') {
      const option = choice.options.find(o => o.card.instanceId === intent.card);
      if (!option) throw new IllegalInput();
      reservePrevention(choice.assignment, option);
    } else throw new IllegalInput();
    state.execution.frames.unshift(frame);
    return;
  }
  if (frame.kind === 'effect') {
    applyEffect(state, frame, intent, selections, credit, costSelections, unitPayment);
    return;
  }
  if (frame.kind === 'trigger-batch') {
    if (intent.kind === 'trigger-player')
      state.execution.frames.unshift({ ...frame, playerId: intent.playerId });
    else if (intent.kind === 'trigger') resolveTrigger(state, frame, intent.triggerId);
    else if (intent.kind !== 'decline-effect' || !frame.chooseAny) throw new IllegalInput();
    return;
  }
  if (frame.kind === 'unique') {
    if (intent.kind !== 'keep-unique') throw new IllegalInput();
    const defeated = frame.cards.filter(id => id !== intent.card).map(id => instance(state, id));
    defeatUpgrades(
      state,
      defeated.filter(card => !isUnit(state, card)),
    );
    defeatUnits(
      state,
      defeated.filter(card => isUnit(state, card)),
    );
    maintenance(state);
    return;
  }
  if (frame.kind === 'action') state.actionHistory = { attacks: [], basesAttacked: [] };
  if (frame.kind === 'action')
    state.execution.frames.unshift(
      { kind: 'flush-triggers' },
      {
        kind: 'finish-action',
        playerId: actor,
        passed: intent.kind === 'pass' || intent.kind === 'take-initiative',
        ...(frame.extraActions === undefined ? {} : { extraActions: frame.extraActions }),
      },
    );
  switch (intent.kind) {
    case 'initiative': {
      state.initiative.holder = intent.playerId;
      state.activePlayer = intent.playerId;
      fact(state, 'initiative', intent.playerId);
      state.execution.frames.push(
        ...state.seats.map(playerId => ({ kind: 'shuffle', playerId }) as const),
        ...state.seats.map(playerId => ({
          kind: 'draw' as const,
          players: [playerId],
          count: startingHandSize(state, playerId),
        })),
        { kind: 'mulligan', playerId: intent.playerId },
        { kind: 'mulligan', playerId: opponent(state, intent.playerId) },
        { kind: 'resource', playerId: intent.playerId, setup: true },
        { kind: 'resource', playerId: opponent(state, intent.playerId), setup: true },
        { kind: 'begin-action' },
      );
      return;
    }
    case 'mulligan':
      fact(state, 'mulligan', actor, [], Number(intent.take));
      if (intent.take) {
        for (const id of [...state.players[actor]!.hand]) move(state, instance(state, id), 'deck');
        state.execution.frames.unshift(
          { kind: 'shuffle', playerId: actor },
          { kind: 'draw', players: [actor], count: startingHandSize(state, actor) },
        );
      }
      return;
    case 'resource': {
      if (frame.kind !== 'resource') throw new IllegalInput();
      const cards = selections.map(id => instance(state, id));
      for (const card of cards) {
        move(state, card, 'resources');
        card.exhausted = !frame.setup;
      }
      fact(state, 'resourced', actor, [], cards.length);
      if (cards.length) fact(state, 'resourced', actor, cards, cards.length, [actor]);
      return;
    }
    case 'play': {
      const granted = grantedDiscardPlay(state, instance(state, intent.card), actor);
      playFromZone(
        state,
        actor,
        intent,
        0,
        false,
        intent.smuggle ? 'resources' : granted ? 'discard' : 'hand',
        granted ? granted.free : false,
        !!intent.smuggle,
        credit,
        false,
        false,
        undefined,
        undefined,
        undefined,
        frame.kind === 'action',
        granted ? granted.ignoreAspectPenalties : false,
        undefined,
        undefined,
        undefined,
        unitPayment,
      );
      break;
    }
    case 'attack': {
      const attacker = instance(state, intent.attacker),
        defender = instance(state, intent.defender);
      beginAttack(state, attacker, defender, actor);
      break;
    }
    case 'use-ability': {
      const card = instance(state, intent.card);
      const ability = effectiveAbilities(state, card).actions?.find(
        ability => ability.id === intent.abilityId,
      );
      if (!ability) throw new IllegalInput();
      const paymentSource = abilityCostSource(card, ability, actor);
      const sacrificed = payAbilityCosts(
        state,
        paymentSource,
        ability,
        (credit ?? 0) + unitPayment,
        intent.costTarget,
        costSelections,
      );
      card.exhausted = paymentSource.exhausted;
      if (ability.limit === 'once-per-round')
        state.roundHistory.actionUses.push(actionUsage(state, card, ability));
      else if (
        ability.limit ||
        activeAbilities(state, card).actions?.some(a => a.id === ability.id)
      )
        card.abilityUses[ability.id] = (card.abilityUses[ability.id] ?? 0) + 1;
      const origin = abilityOrigins(state, card).find(
        o => o.id !== 'self' && ability.id.startsWith(`${o.id}-`),
      );
      fact(state, 'ability-used', actor, [card, ...(origin ? [origin.card] : [])]);
      state.execution.frames.unshift(
        ...effectFrames(actor, card, ability.effects, origin ? { origin } : {}),
      );
      applyCardCosts(state, paymentSource, ability.costs, costSelections ?? []);
      if (sacrificed) {
        defeatUnits(state, [sacrificed]);
        maintenance(state);
      }
      break;
    }
    case 'take-initiative':
      state.initiative = { holder: actor, claimed: true };
      collectTriggers(
        state,
        'initiative-taken',
        abilitySources(state).filter(c => c.controller === actor),
      );
      state.execution.pendingTriggers.push(...takePhaseTriggers(state, actor, 'initiative-taken'));
      fact(state, 'initiative', actor);
      maintenance(state);
      break;
    case 'pass':
      fact(state, 'passed', actor);
      break;
  }
}

function acceptDecision(state: GameState, input: Extract<EngineInput, { type: 'decision' }>) {
  const plan = resourcePlan(state, input.playerId);
  const decision = decisionForPlayer(state, input.playerId),
    frame = plan ?? state.execution.frames[0];
  if (
    !decision ||
    !frame ||
    input.decisionId !== decision.id ||
    input.playerId !== decision.playerId
  )
    throw new IllegalInput();
  const option = decision.options.find(option => option.id === input.optionId);
  if (!option) throw new IllegalInput();
  const legal = plan
    ? decision.options.map(o => o.intent)
    : frame.kind === 'action'
      ? actionIntents(state)
      : frameIntents(state, frame);
  if (!legal.some(intent => JSON.stringify(intent) === JSON.stringify(option.intent)))
    throw new IllegalInput();
  const numbering = frame.kind === 'effect' && frame.effect.kind === 'choose-number';
  if (numbering ? input.chosenNumber === undefined : input.chosenNumber !== undefined)
    throw new IllegalInput();
  const naming = frame.kind === 'effect' && frame.effect.kind === 'name-card';
  const chosenName =
    input.namedCardId === undefined ? undefined : cardTitle(state, input.namedCardId);
  if (naming ? !chosenName : input.namedCardId !== undefined) throw new IllegalInput();
  const declining =
    option.intent.kind === 'decline-effect' &&
    (frame.kind === 'allocate-damage' || frame.kind === 'disclose');
  const selection = declining ? null : decision.selection;
  if (
    selection?.disclose &&
    !disclosureSatisfied(selection.disclose.required, selection.disclose.icons, input.selections)
  )
    throw new IllegalInput();
  if (
    selection?.budget &&
    input.selections.reduce((sum, id) => sum + (selection.budget!.costs[id] ?? Infinity), 0) >
      selection.budget.max
  )
    throw new IllegalInput();
  if (
    selection
      ? input.selections.length < selection.min ||
        input.selections.length > selection.max ||
        (!selection.allocation && new Set(input.selections).size !== input.selections.length) ||
        (selection.allocation &&
          input.selections.some(
            id =>
              input.selections.filter(c => c === id).length >
                (selection.allocation?.limits[id] ?? 0) ||
              input.selections.filter(c => c === id).length %
                (selection.allocation?.quantum ?? 1) !==
                0,
          )) ||
        input.selections.some(id => !selection.cards.includes(id))
      : input.selections.length > 0
  )
    throw new IllegalInput();
  if (plan) {
    if (option.intent.kind === 'cancel-resource') delete plan.queuedResources;
    else
      plan.queuedResources = input.selections.map(id => ({
        instanceId: id,
        incarnation: instance(state, id).incarnation,
      }));
    return;
  }
  state.execution.decision = null;
  state.execution.frames.shift();
  if (frame.kind === 'effect' && frame.effect.kind === 'name-card') {
    fact(state, 'card-named', input.playerId, [frame.source]);
    state.facts.at(-1)!.namedCard = chosenName!;
    state.execution.frames.unshift(
      ...effectFrames(frame.playerId, frame.source, frame.effect.effects, {
        ...frame,
        names: { ...frame.names, [frame.effect.bind]: chosenName! },
      }),
    );
  } else if (frame.kind === 'effect' && frame.effect.kind === 'choose-number') {
    fact(state, 'number-chosen', input.playerId, [frame.source], input.chosenNumber!);
    state.execution.frames.unshift(
      ...effectFrames(frame.playerId, frame.source, frame.effect.effects, {
        ...frame,
        values: { ...frame.values, [frame.effect.bind]: input.chosenNumber! },
      }),
    );
  } else applyIntent(state, option.intent, input.selections, frame, input.playerId);
}

export function createGame(config: GameConfig): GameState {
  const state = initialState(config);
  if (config.initiativeChooser)
    prompt(state, state.execution.frames[0]!, config.initiativeChooser, 'initiative');
  settle(state);
  assertState(state);
  return state;
}

export type Transition = { state: GameState; facts: Fact[] };
export function advance(previous: GameState, rawInput: unknown): Transition {
  assertCompatibleVersions(previous.versions);
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) throw new IllegalInput();
  const input = parsed.data;
  if (
    input.gameId !== previous.gameId ||
    input.expectedRevision !== previous.revision ||
    previous.phase === 'ended'
  )
    throw new IllegalInput();
  const state = structuredClone(previous);
  if (input.type === 'concede') {
    if (!state.seats.includes(input.playerId)) throw new IllegalInput();
    endGame(state, opponent(state, input.playerId), 'concession');
  } else if (input.type === 'random') acceptRandom(state, input);
  else acceptDecision(state, input);
  state.revision++;
  settle(state);
  assertState(state);
  return { state, facts: state.facts.slice(previous.facts.length) };
}
