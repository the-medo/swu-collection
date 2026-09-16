import { pendingBaseUpgradeProtectors } from './attachments.ts';
import { matchingPlayModifiers } from './play-keywords.ts';
import { resourcePayment } from './resource-payment.ts';
import { unitDefeatChoice, defeatAttachmentTargets } from './unit-defeat.ts';
import { printedCost } from './inspection.ts';
import { sequenceIntents } from './sequences.ts';
import { abilityCostSource } from './abilities.ts';
import { activeLasting } from './lasting.ts';
import { exploitSelection } from './exploit.ts';
import { departedAttachments } from './departed-attachments.ts';
import { attachablePilots, detachablePilots } from './pilot-conversion.ts';
import { tokenReplacementSources } from './token-creation.ts';
import { attackEffectOrigins } from './attack-grants.ts';
import type { AbilityOrigin } from './model.ts';
import { cannotPlayCard } from './play-restrictions.ts';
import { combatOrderIntents } from './combat.ts';
import { abilityPaymentSelection } from './ability-payment.ts';
import { taxSelection } from './unit-tax.ts';
import { arrangeIntents, arrangeSelection } from './deck-order.ts';
import { benefitSelection } from './benefits.ts';
import { hasSacrificeCost, sacrificeCandidates } from './abilities.ts';
import { grantedDiscardPlay } from './play-permissions.ts';
import { zoneSearchSelection } from './zone-search.ts';
import { numericValue } from './values.ts';

import { unitIsLeader } from './attributes.ts';
import { reattachmentTargets } from './attachments.ts';
import { activeAbilities, deployCondition } from './abilities.ts';
import { conditionMatches } from './conditions.ts';
import { credits, creditSelection, spendingPower } from './credits.ts';
import { disclosureSelection } from './disclose.ts';
import { plotPlay } from './plot.ts';
import { playActor, cardPlayIntents, nestedPlayIntents } from './play-options.ts';
import { inspectionSelection } from './inspection.ts';
import { costCards } from './ability-payment.ts';
import { matchingUpgrades } from './upgrade-selection.ts';
import { indirectSelection } from './indirect.ts';
import { cannotGainKeywords } from './lasting.ts';
import { effectCostSource, canPayAbilityCosts } from './abilities.ts';
import { unitStats } from './attachments.ts';
import { boundUnit } from './bindings.ts';
import { matchesUnit, matchingUnits } from './targets.ts';
import {
  abilitiesFrom,
  effectiveAbilities,
  potentialAbilitySources,
  mayHaveAbility,
  supportOrigins,
} from './effective-abilities.ts';
import { searchSelection, searchOwner } from './search.ts';
import { isUpgrade, exhaustibleLeaders } from './roles.ts';
import { canAttach, isUnit, unitKeywords } from './attachments.ts';
import { excessDamageChoice } from './excess-damage.ts';
import { damagePreventionChoice } from './damage.ts';
import { canUseAbility } from './abilities.ts';
import { cardDefinition } from '../cards/catalog.ts';
import type { Frame, GameState, Intent, CardInstance } from './model.ts';
import { reference, instance, isArena, opponent, playCost } from './state.ts';
import { abilitySources, triggerAvailable, sameIncarnation } from './triggers.ts';

export function actionIntents(state: GameState): Intent[] {
  const actor = state.activePlayer;
  const player = state.players[actor]!;
  const intents: Intent[] = player.hand.flatMap(id =>
    cardPlayIntents(state, instance(state, id), actor, 0, false, true, false, true),
  );
  const grantedSmuggle = potentialAbilitySources(state, 'resourceSmuggle').length > 0;
  for (const id of player.resources)
    if (grantedSmuggle || mayHaveAbility(state, instance(state, id), 'smuggle'))
      intents.push(
        ...cardPlayIntents(
          state,
          instance(state, id),
          actor,
          0,
          false,
          false,
          false,
          true,
          false,
          'smuggle',
        ),
      );
  for (const id of new Set(state.grantedPlays.map(p => p.target.instanceId))) {
    const card = instance(state, id);
    const permission = grantedDiscardPlay(state, card, actor);
    if (permission)
      intents.push(
        ...cardPlayIntents(
          state,
          { ...card, controller: actor },
          actor,
          permission.discount ?? 0,
          permission.free,
          !permission.free,
          false,
          true,
          permission.ignoreAspectPenalties,
          undefined,
          undefined,
          permission.phaseAbilities,
        ),
      );
  }
  for (const arena of ['ground', 'space'] as const) {
    for (const id of state[arena]) {
      const card = instance(state, id);
      if (card.controller !== actor || card.exhausted || !isUnit(state, card)) continue;
      for (const defender of attackTargets(state, card))
        intents.push({ kind: 'attack', attacker: id, defender });
    }
  }
  for (const card of Object.values(state.cards)) {
    if (!(card.zone === 'base' || isArena(card.zone) || card.zone === 'discard')) continue;
    if (
      card.zone === 'discard' &&
      !activeAbilities(state, card).actions?.some(a => a.zone === 'discard')
    )
      continue;
    for (const ability of effectiveAbilities(state, card).actions ?? []) {
      if (
        (card.controller === actor || ability.anyPlayer) &&
        (ability.zone ? card.zone === ability.zone : card.zone !== 'discard') &&
        canUseAbility(state, abilityCostSource(card, ability, actor), ability)
      )
        for (const target of hasSacrificeCost(ability)
          ? sacrificeCandidates(state, card)
          : [undefined])
          intents.push({
            kind: 'use-ability',
            card: card.instanceId,
            abilityId: ability.id,
            ...(target ? { costTarget: target.instanceId } : {}),
          });
    }
  }
  if (!state.initiative.claimed) intents.push({ kind: 'take-initiative' });
  intents.push({ kind: 'pass' });
  return intents;
}

export function attackTargets(
  state: GameState,
  attacker: import('./model.ts').CardInstance,
  unitsOnly = false,
  grantedKeywords: readonly string[] = [],
): string[] {
  if (
    !isUnit(state, attacker) ||
    effectiveAbilities(state, attacker).cannotAttack ||
    (effectiveAbilities(state, attacker).cannotAttackUndamaged && attacker.damage === 0)
  )
    return [];
  const abilities = effectiveAbilities(state, attacker);
  const enemies = (
    abilities.attackBothArenas
      ? [...state.ground, ...state.space]
      : state[attacker.zone as 'ground' | 'space']
  )
    .map(id => instance(state, id))
    .filter(card => isUnit(state, card) && card.controller !== attacker.controller);
  const sentinels = enemies.filter(
    card => card.zone === attacker.zone && unitKeywords(state, card).includes('Sentinel'),
  );
  if (
    sentinels.length &&
    !unitKeywords(state, attacker).includes('Saboteur') &&
    (!grantedKeywords.includes('Saboteur') || cannotGainKeywords(state, attacker))
  )
    return sentinels.map(card => card.instanceId);
  const protections = enemies.length
    ? potentialAbilitySources(state, 'protectFromAttackUnlessSentinel').flatMap(source =>
        (effectiveAbilities(state, source).protectFromAttackUnlessSentinel ?? []).map(filter => ({
          source,
          filter,
        })),
      )
    : [];
  return [
    ...(unitsOnly ||
    abilities.cannotAttackBases ||
    activeLasting(state, attacker).some(e => e.cannotAttackBases)
      ? []
      : [state.players[opponent(state, attacker.controller)]!.base]),
    ...enemies
      .filter(
        card =>
          unitKeywords(state, card).includes('Sentinel') ||
          (!activeLasting(state, card).some(e => e.cannotBeAttacked) &&
            (!unitKeywords(state, card).includes('Hidden') ||
              !state.phaseHistory.entered.some(
                ref => ref.instanceId === card.instanceId && ref.incarnation === card.incarnation,
              )) &&
            !protections.some(({ source, filter }) =>
              matchesUnit(state, card, source.controller, filter, { source }),
            )),
      )
      .map(card => card.instanceId),
  ];
}

function attackTargetsWithGrants(
  state: GameState,
  attacker: CardInstance,
  unitsOnly: boolean,
  grantedAbilities: AbilityOrigin[],
): string[] {
  if (!grantedAbilities.length) return attackTargets(state, attacker, unitsOnly);
  const enemy = opponent(state, attacker.controller);
  const candidates = [
    state.players[enemy]!.base,
    ...[...state.ground, ...state.space].filter(
      id => isUnit(state, state.cards[id]!) && state.cards[id]!.controller === enemy,
    ),
  ];
  return candidates.filter(id => {
    const defender = instance(state, id);
    const context: GameState = {
      ...state,
      attacks: [
        ...state.attacks,
        {
          id: 'declaration-preview',
          attacker: reference(attacker),
          defender: reference(defender),
          defendingPlayer: defender.controller,
          grantedAbilities,
          powerBonus: 0,
          ambush: false,
          attackerFirst: false,
          removedFromCombat: [],
          baseDamageSources: [],
          combatDamage: [],
          defeated: [],
        },
      ],
    };
    return attackTargets(context, attacker, unitsOnly).includes(id);
  });
}

export function frameIntents(state: GameState, frame: Frame): Intent[] {
  switch (frame.kind) {
    case 'free-play-choice':
      return [
        { kind: 'choose-mode', mode: 'play-for-free' },
        ...(state.playPayment?.freeOffer?.normal
          ? [{ kind: 'choose-mode' as const, mode: 'pay-cost' }]
          : []),
        { kind: 'decline-effect' },
      ];
    case 'unit-defeat': {
      const card = unitDefeatChoice(state, frame);
      return card
        ? [
            ...defeatAttachmentTargets(state, card).map(c => ({
              kind: 'target' as const,
              card: c.instanceId,
            })),
            { kind: 'decline-effect' },
          ]
        : [];
    }
    case 'different-unit-damage':
      return frame.targets
        .filter(
          target =>
            !frame.usedTargets.some(
              used =>
                used.instanceId === target.instanceId && used.incarnation === target.incarnation,
            ) &&
            state.cards[target.instanceId]?.incarnation === target.incarnation &&
            isUnit(state, state.cards[target.instanceId]!) &&
            state.cards[target.instanceId]!.controller !== frame.playerId,
        )
        .map(target => ({ kind: 'target' as const, card: target.instanceId }));
    case 'special-play-payment':
      return [{ kind: 'accept-effect' }];
    case 'upgrade-defeat':
      return [{ kind: 'accept-effect' }, { kind: 'decline-effect' }];
    case 'base-upgrade-protection':
      return [
        ...pendingBaseUpgradeProtectors(state, frame).map(card => ({
          kind: 'target' as const,
          card: card.instanceId,
        })),
        { kind: 'decline-effect' },
      ];
    case 'create-tokens':
      return [
        ...tokenReplacementSources(state, frame).map(card => ({
          kind: 'target' as const,
          card: card.instanceId,
        })),
        { kind: 'decline-effect' },
      ];
    case 'combat-order':
      return combatOrderIntents(state, frame);
    case 'optional-trigger':
      return [{ kind: 'accept-effect' }, { kind: 'decline-effect' }];
    case 'unit-tax':
    case 'ability-payment':
    case 'credit-payment':
    case 'exploit-payment':
    case 'exploit-play':
      return [{ kind: 'accept-effect' }];
    case 'disclose':
      return [{ kind: 'accept-effect' }, { kind: 'decline-effect' }];
    case 'capture-pairs':
    case 'attack-series':
      return sequenceIntents(state, frame);
    case 'plot-reveal':
    case 'allocate-benefit':
    case 'zone-search':
    case 'zone-inspection':
      return [{ kind: 'accept-effect' }];
    case 'allocate-damage':
      return [
        { kind: 'accept-effect' },
        ...(frame.optional ? [{ kind: 'decline-effect' as const }] : []),
      ];
    case 'allocate-indirect':
      return [{ kind: 'accept-effect' }];
    case 'first-player':
      return state.seats.map(playerId => ({ kind: 'initiative', playerId }));
    case 'mulligan': {
      const base = cardDefinition(
        state,
        instance(state, state.players[frame.playerId]!.base).cardId,
      );
      return [
        { kind: 'mulligan', take: false },
        ...(base.kind === 'base' && base.cannotMulligan
          ? []
          : [{ kind: 'mulligan' as const, take: true }]),
      ];
    }
    case 'resource':
      return [{ kind: 'resource' }];
    case 'arrange-deck':
      return arrangeIntents(frame);
    case 'search':
      return [{ kind: 'search' }];
    case 'action':
      return actionIntents(state);
    case 'damage': {
      const choice = damagePreventionChoice(state, frame);
      return choice
        ? [
            ...choice.options.map(o => ({ kind: 'target' as const, card: o.card.instanceId })),
            ...(!choice.mandatory ? [{ kind: 'decline-effect' as const }] : []),
          ]
        : excessDamageChoice(state, frame)
          ? [
              ...excessDamageChoice(state, frame)!.targets.map(c => ({
                kind: 'target' as const,
                card: c.instanceId,
              })),
              { kind: 'decline-effect' },
            ]
          : [];
    }
    case 'unique':
      return frame.cards.map(card => ({ kind: 'keep-unique', card }));
    case 'delayed-batch':
    case 'trigger-batch': {
      const entries =
        frame.kind === 'trigger-batch'
          ? frame.triggers.filter(t => triggerAvailable(state, t))
          : frame.effects;
      const players = state.seats.filter(id => entries.some(entry => entry.playerId === id));
      const selected = players.includes(frame.playerId!)
        ? frame.playerId
        : players.length === 1
          ? players[0]
          : null;
      return selected
        ? [
            ...(frame.kind === 'trigger-batch' && frame.chooseAny
              ? [{ kind: 'decline-effect' as const }]
              : []),
            ...entries
              .filter(entry => entry.playerId === selected)
              .map(entry =>
                frame.kind === 'trigger-batch'
                  ? { kind: 'trigger' as const, triggerId: entry.id }
                  : { kind: 'delayed' as const, effectId: entry.id },
              ),
          ]
        : players.map(playerId => ({
            kind: frame.kind === 'trigger-batch' ? 'trigger-player' : 'delayed-player',
            playerId,
          }));
    }
    case 'effect': {
      const effect = frame.effect;
      if (effect.kind === 'deploy' && effect.as === 'unit-or-upgrade') {
        const leader = state.cards[frame.source.instanceId];
        if (
          !leader ||
          leader.incarnation !== frame.source.incarnation ||
          leader.zone !== 'base' ||
          leader.deployedAs !== null ||
          !deployCondition(state, frame.playerId, effect)
        )
          return [];
        return [
          { kind: 'choose-mode', mode: 'deploy-unit' },
          ...[...state.ground, ...state.space]
            .map(id => instance(state, id))
            .filter(unit => canAttach(state, leader, unit))
            .map(unit => ({ kind: 'target' as const, card: unit.instanceId })),
        ];
      }
      if (effect.kind === 'attach-self') {
        const self = boundUnit(state, frame, 'source');
        return self && isUnit(state, self)
          ? [
              ...matchingUnits(state, frame.playerId, effect.filter, frame)
                .filter(c => c.instanceId !== self.instanceId)
                .map(c => ({ kind: 'target' as const, card: c.instanceId })),
              ...(effect.optional ? [{ kind: 'decline-effect' as const }] : []),
            ]
          : [];
      }
      if (effect.kind === 'attach-pilot' || effect.kind === 'detach-pilot') {
        const cards =
          effect.kind === 'attach-pilot'
            ? attachablePilots(state, frame.playerId, boundUnit(state, frame, effect.host))
            : detachablePilots(state);
        return [
          ...cards.map(card => ({ kind: 'target' as const, card: card.instanceId })),
          ...(effect.kind === 'attach-pilot' && effect.optional
            ? [{ kind: 'decline-effect' as const }]
            : []),
        ];
      }
      if (effect.kind === 'attach-leader') {
        const leader = sameIncarnation(state, frame.source);
        return leader &&
          cardDefinition(state, leader.cardId).kind === 'leader' &&
          leader.zone === 'base' &&
          leader.deployedAs === null
          ? [...state.ground, ...state.space]
              .map(id => instance(state, id))
              .filter(host => canAttach(state, leader, host))
              .map(host => ({ kind: 'target' as const, card: host.instanceId }))
          : [];
      }
      if (effect.kind === 'reattach-upgrade') {
        const upgrade = boundUnit(state, frame, effect.target);
        return upgrade && isUpgrade(state, upgrade)
          ? reattachmentTargets(state, upgrade)
              .filter(
                c =>
                  !effect.filter ||
                  matchesUnit(
                    state,
                    c,
                    effect.chooser === 'controller' ? upgrade.controller : frame.playerId,
                    effect.filter,
                    frame,
                  ),
              )
              .map(c => ({
                kind: 'target' as const,
                card: c.instanceId,
              }))
          : [];
      }
      if (effect.kind === 'exhaust-leader')
        return [
          ...exhaustibleLeaders(state, frame.playerId).map(c => ({
            kind: 'target' as const,
            card: c.instanceId,
          })),
          { kind: 'decline-effect' },
        ];
      if (effect.kind === 'name-card' || effect.kind === 'choose-number')
        return [{ kind: 'accept-effect' }];
      if (effect.kind === 'damage-chosen-bases') return [{ kind: 'accept-effect' }];
      if (effect.kind === 'defeat-credit')
        return [
          ...credits(state, frame.playerId, effect.controller).map(c => ({
            kind: 'target' as const,
            card: c.instanceId,
          })),
          ...(effect.optional ? [{ kind: 'decline-effect' as const }] : []),
        ];
      if (effect.kind === 'plot-play')
        return nestedPlayIntents(state, frame.playerId, plotPlay, frame);
      if (effect.kind === 'play-card')
        return nestedPlayIntents(state, frame.playerId, effect, frame);
      if (effect.kind === 'play-unit') {
        const ready = spendingPower(state, frame.playerId);
        // V8 §7.1.6a: a modified action involving hidden information may fail
        // even when the controller has a playable card in hand.
        return [
          ...state.players[frame.playerId]!.hand.filter(id => {
            const card = instance(state, id);
            return (
              !cannotPlayCard(state, card, frame.playerId) &&
              cardDefinition(state, card.cardId).kind === 'unit' &&
              (resourcePayment(state, frame.playerId, playCost(state, card, effect.discount)) <=
                ready ||
                matchingPlayModifiers(state, card, true).some(m => m.optionalFreeCopy))
            );
          }).map(card => ({ kind: 'play' as const, card })),
          { kind: 'decline-effect' },
        ];
      }
      if (effect.kind === 'indirect-damage' && effect.recipient === 'chosen')
        return state.seats.map(playerId => ({ kind: 'choose-player' as const, playerId }));
      if (effect.kind === 'resource-top')
        return [
          ...(state.players[
            effect.player === 'enemy' ? opponent(state, frame.playerId) : frame.playerId
          ]!.deck.length
            ? [{ kind: 'accept-effect' as const }]
            : []),
          ...(effect.optional ? [{ kind: 'decline-effect' as const }] : []),
        ];
      if (effect.kind === 'select-target')
        return (() => {
          return [
            ...(effect.units
              ? matchingUnits(state, frame.playerId, effect.units, frame)
                  .filter(c => {
                    const other = effect.otherThan && boundUnit(state, frame, effect.otherThan);
                    return (
                      !other ||
                      c.instanceId !== other.instanceId ||
                      c.incarnation !== other.incarnation
                    );
                  })
                  .map(c => ({
                    kind: 'target' as const,
                    card: c.instanceId,
                  }))
              : []),
            ...(effect.bases
              ? state.seats
                  .filter(
                    p =>
                      effect.bases === 'any' ||
                      (p === frame.playerId) === (effect.bases === 'friendly'),
                  )
                  .map(p => state.cards[state.players[p]!.base]!)
                  .filter(base => {
                    const other = effect.otherThan && boundUnit(state, frame, effect.otherThan);
                    const definition = cardDefinition(state, base.cardId);
                    return (
                      (!other ||
                        base.instanceId !== other.instanceId ||
                        base.incarnation !== other.incarnation) &&
                      (effect.baseRemainingHpAtMost === undefined ||
                        (definition.kind === 'base' &&
                          definition.hp - base.damage <= effect.baseRemainingHpAtMost))
                    );
                  })
                  .map(base => ({ kind: 'target' as const, card: base.instanceId }))
              : []),
            ...(effect.optional ? [{ kind: 'decline-effect' as const }] : []),
          ];
        })();
      if (effect.kind === 'unit-to-deck') {
        const unit = boundUnit(state, frame, effect.target);
        return unit && isUnit(state, unit) && !unitIsLeader(state, unit)
          ? [
              { kind: 'choose-mode', mode: 'deck-top' },
              { kind: 'choose-mode', mode: 'deck-bottom' },
            ]
          : [];
      }
      if (effect.kind === 'select-upgrades' || effect.kind === 'select-resources')
        return [{ kind: 'accept-effect' }];
      if (effect.kind === 'defeat-tokens' || effect.kind === 'defeat-credits')
        return [{ kind: 'accept-effect' }];
      if (effect.kind === 'select-units') return [{ kind: 'accept-effect' }];
      if (effect.kind === 'pay') {
        const current = effectCostSource(
          state,
          frame.source,
          effect.costs,
          effect.player === 'enemy' ? opponent(state, frame.playerId) : frame.playerId,
        );
        const canPay =
          current &&
          canPayAbilityCosts(state, current, {
            id: 'effect-payment',
            costs: effect.costs,
            limit: null,
            effects: [],
          });
        return [
          ...(canPay ? [{ kind: 'accept-effect' as const }] : []),
          ...(effect.optional ? [{ kind: 'decline-effect' as const }] : []),
        ];
      }
      if (effect.kind === 'choose-mode')
        return effect.options
          .filter(o => !o.condition || conditionMatches(state, frame.playerId, o.condition, frame))
          .map(option => ({ kind: 'choose-mode', mode: option.id }));
      if (effect.kind === 'select-departed-upgrade')
        return [
          ...departedAttachments(state, frame, effect.target).map(card => ({
            kind: 'target' as const,
            card: card.instanceId,
          })),
          ...(effect.optional ? [{ kind: 'decline-effect' as const }] : []),
        ];
      if (effect.kind === 'select-unit') {
        let candidates = matchingUnits(state, frame.playerId, effect.filter, frame);
        if (effect.leastRemainingHp && candidates.length) {
          const remaining = (card: CardInstance) => unitStats(state, card).hp - card.damage;
          const least = Math.min(...candidates.map(remaining));
          candidates = candidates.filter(card => remaining(card) === least);
        }
        return [
          ...candidates
            .filter(
              card =>
                !effect.forAttack ||
                (card.controller === frame.playerId &&
                  (!card.exhausted || effect.forAttack.evenIfExhausted) &&
                  attackTargets(state, card, effect.forAttack.unitsOnly).length > 0),
            )
            .map(card => ({ kind: 'target' as const, card: card.instanceId })),
          ...(effect.optional ? [{ kind: 'decline-effect' as const }] : []),
        ];
      }
      if (effect.kind === 'take-enemy-credit')
        return credits(state, frame.playerId, 'enemy').map(c => ({
          kind: 'target' as const,
          card: c.instanceId,
        }));
      if (effect.kind === 'ready-leader')
        return [
          ...state.seats
            .map(p => instance(state, state.players[p]!.leader))
            .filter(c => !c.deployedAs)
            .map(c => ({ kind: 'target' as const, card: c.instanceId })),
          ...(effect.optional ? [{ kind: 'decline-effect' as const }] : []),
        ];
      if (effect.kind === 'attack-bound') {
        const card = boundUnit(state, frame, effect.target);
        return [
          ...(card &&
          isUnit(state, card) &&
          (!card.exhausted || effect.evenIfExhausted) &&
          card.controller === frame.playerId
            ? attackTargetsWithGrants(
                state,
                card,
                !!effect.unitsOnly,
                attackEffectOrigins(state, frame),
              ).map(defender => ({
                kind: 'attack' as const,
                attacker: card.instanceId,
                defender,
              }))
            : []),
          ...(effect.optional ? [{ kind: 'decline-effect' as const }] : []),
        ];
      }
      if (effect.kind === 'support') {
        return [
          ...[...state.ground, ...state.space].flatMap(id => {
            const card = instance(state, id);
            return isUnit(state, card) &&
              !card.exhausted &&
              card.controller === frame.playerId &&
              (card.instanceId !== frame.source.instanceId ||
                card.incarnation !== frame.source.incarnation)
              ? attackTargetsWithGrants(
                  state,
                  card,
                  false,
                  supportOrigins(state, frame.source, true),
                ).map(defender => ({
                  kind: 'attack' as const,
                  attacker: id,
                  defender,
                }))
              : [];
          }),
          { kind: 'decline-effect' },
        ];
      }
      if (effect.kind === 'attack-with-unit') {
        return [...state.ground, ...state.space].flatMap(id => {
          const card = instance(state, id);
          return isUnit(state, card) &&
            !card.exhausted &&
            card.controller === frame.playerId &&
            (!effect.filter || matchesUnit(state, card, frame.playerId, effect.filter, frame))
            ? attackTargets(state, card).map(defender => ({
                kind: 'attack' as const,
                attacker: id,
                defender,
              }))
            : [];
        });
      }
      if (effect.kind === 'damage-unit') {
        const cards =
          effect.arena === 'any' ? [...state.ground, ...state.space] : state[effect.arena];
        return [
          ...cards
            .filter(
              id =>
                matchesUnit(state, instance(state, id), frame.playerId, effect.filter) &&
                (effect.controller !== 'enemy' ||
                  instance(state, id).controller !== frame.playerId),
            )
            .map(card => ({ kind: 'target' as const, card })),
          ...(effect.optional ? [{ kind: 'decline-effect' as const }] : []),
        ];
      }
      if (effect.kind === 'choose-self-token') {
        const card = sameIncarnation(state, frame.source);
        return card && isUnit(state, card)
          ? [
              { kind: 'choose-token', token: 'shield' },
              { kind: 'choose-token', token: 'experience' },
            ]
          : [];
      }
      if (effect.kind === 'defeat-upgrade')
        return [
          ...[...state.ground, ...state.space]
            .filter(id => {
              const card = instance(state, id);
              const host = effect.attachedTo && boundUnit(state, frame, effect.attachedTo);
              return (
                isUpgrade(state, card) &&
                (!effect.nonUnique || !cardDefinition(state, card.cardId).unique) &&
                (!effect.attachedTo ||
                  (!!host &&
                    card.attachedTo?.instanceId === host.instanceId &&
                    card.attachedTo.incarnation === host.incarnation))
              );
            })
            .map(card => ({ kind: 'target' as const, card })),
          ...(effect.optional ? [{ kind: 'decline-effect' as const }] : []),
        ];
      if (effect.kind === 'heal-unit')
        return [
          ...[...state.ground, ...state.space]
            .filter(id => isUnit(state, instance(state, id)))
            .map(card => ({ kind: 'target' as const, card })),
          ...(effect.optional ? [{ kind: 'decline-effect' as const }] : []),
        ];
      if (effect.kind === 'damage-units' && effect.max !== undefined)
        return [{ kind: 'accept-effect' }];
      if (effect.kind === 'defeat-unit')
        return [
          ...matchingUnits(state, frame.playerId, effect.filter, frame).map(card => ({
            kind: 'target' as const,
            card: card.instanceId,
          })),
          ...(effect.optional ? [{ kind: 'decline-effect' as const }] : []),
        ];
      if (effect.kind === 'heal-base' || effect.kind === 'damage-base')
        return state.seats.map(id => ({ kind: 'target', card: state.players[id]!.base }));
      if (effect.kind === 'self-resource') {
        const card = sameIncarnation(state, frame.source);
        return card && (card.zone === 'discard' || isUnit(state, card))
          ? [
              { kind: 'accept-effect' },
              ...(effect.optional === false ? [] : [{ kind: 'decline-effect' as const }]),
            ]
          : [];
      }
      if (effect.kind === 'ambush') {
        const card = sameIncarnation(state, frame.source);
        const canAttackBases =
          card &&
          abilitySources(state).some(
            source =>
              source.controller === card.controller &&
              effectiveAbilities(state, source).ambushCanAttackBases,
          );
        const targets =
          card && isUnit(state, card) && card.controller === frame.playerId
            ? attackTargets(state, card, !canAttackBases)
            : [];
        return [
          ...targets.map(card => ({ kind: 'target' as const, card })),
          { kind: 'decline-effect' },
        ];
      }
      return [];
    }
    default:
      return [];
  }
}

export function decisionContext(
  state: GameState,
  frame: Frame,
): { playerId: string; kind: import('./model.ts').Decision['kind'] } | null {
  switch (frame.kind) {
    case 'free-play-choice':
      return { playerId: frame.playerId, kind: 'effect' };
    case 'unit-defeat': {
      const card = unitDefeatChoice(state, frame);
      return card ? { playerId: card.controller, kind: 'replacement' } : null;
    }
    case 'upgrade-defeat':
      return { playerId: frame.card.controller, kind: 'replacement' };
    case 'base-upgrade-protection':
      return { playerId: frame.card.controller, kind: 'replacement' };
    case 'create-tokens':
      return tokenReplacementSources(state, frame).length
        ? { playerId: frame.creator, kind: 'replacement' }
        : null;
    case 'combat-order':
      return { playerId: frame.playerId, kind: 'effect' };
    case 'optional-trigger':
      return { playerId: frame.trigger.playerId, kind: 'effect' };
    case 'ability-payment':
    case 'credit-payment':
    case 'exploit-payment':
      return { playerId: frame.playerId, kind: 'effect' };
    case 'disclose':
      return { playerId: frame.chooser, kind: 'effect' };
    case 'plot-reveal':
      return { playerId: frame.playerId, kind: 'effect' };
    case 'zone-inspection':
      return { playerId: frame.chooser, kind: 'effect' };
    case 'allocate-benefit':
    case 'allocate-damage':
      return { playerId: frame.playerId, kind: 'effect' };
    case 'allocate-indirect':
      return { playerId: frame.assigner, kind: 'effect' };
    case 'first-player':
      return {
        playerId: state.execution.decision?.playerId ?? state.activePlayer,
        kind: 'initiative',
      };
    case 'zone-search':
      return { playerId: frame.playerId, kind: 'search' };
    case 'unit-tax':
      return { playerId: frame.chooser, kind: 'effect' };
    case 'capture-pairs':
    case 'attack-series':
    case 'arrange-deck':
      return { playerId: frame.playerId, kind: 'effect' };
    case 'different-unit-damage':
      return { playerId: frame.playerId, kind: 'effect' };
    case 'special-play-payment':
      return { playerId: frame.playerId, kind: 'effect' };
    case 'search':
      return { playerId: searchOwner(state, frame), kind: 'search' };
    case 'mulligan':
    case 'resource':
    case 'unique':
      return { playerId: frame.playerId, kind: frame.kind };
    case 'effect':
      return {
        playerId:
          frame.effect.kind === 'reattach-upgrade' && frame.effect.chooser === 'controller'
            ? (boundUnit(state, frame, frame.effect.target)?.controller ?? frame.playerId)
            : frame.effect.kind === 'pay' && frame.effect.player === 'enemy'
              ? opponent(state, frame.playerId)
              : frame.effect.kind === 'play-card'
                ? playActor(state, frame.playerId, frame.effect, frame)
                : frame.effect.kind === 'select-unit' && frame.effect.chooser === 'enemy'
                  ? opponent(state, frame.playerId)
                  : frame.effect.kind === 'select-unit' && frame.effect.chooserOf
                    ? (boundUnit(state, frame, frame.effect.chooserOf)?.controller ??
                      frame.playerId)
                    : frame.effect.kind === 'select-target' && frame.effect.chooser === 'enemy'
                      ? opponent(state, frame.playerId)
                      : frame.effect.kind === 'select-target' && frame.effect.chooserOf
                        ? (boundUnit(state, frame, frame.effect.chooserOf)?.controller ??
                          frame.playerId)
                        : frame.effect.kind === 'choose-mode' && frame.effect.chooser === 'enemy'
                          ? opponent(state, frame.playerId)
                          : frame.effect.kind === 'choose-mode' && frame.effect.chooserOf
                            ? (boundUnit(state, frame, frame.effect.chooserOf)?.controller ??
                              frame.playerId)
                            : frame.effect.kind === 'unit-to-deck'
                              ? (boundUnit(state, frame, frame.effect.target)?.owner ??
                                frame.playerId)
                              : frame.effect.kind === 'select-resources' &&
                                  frame.effect.player === 'enemy' &&
                                  frame.effect.chooser !== 'self'
                                ? opponent(state, frame.playerId)
                                : frame.playerId,
        kind: 'effect',
      };
    case 'damage': {
      const choice = damagePreventionChoice(state, frame);
      return choice
        ? { playerId: choice.playerId, kind: 'replacement' }
        : excessDamageChoice(state, frame)?.targets.length
          ? { playerId: excessDamageChoice(state, frame)!.route.source.controller, kind: 'effect' }
          : null;
    }
    case 'action':
      return { playerId: state.activePlayer, kind: 'action' };
    case 'delayed-batch':
    case 'trigger-batch': {
      if (frame.kind === 'trigger-batch' && frame.chooseAny && frame.playerId)
        return { playerId: frame.playerId, kind: 'trigger' };
      const intent = frameIntents(state, frame)[0];
      if (intent?.kind === 'trigger-player' || intent?.kind === 'delayed-player')
        return { playerId: state.activePlayer, kind: intent.kind };
      if (intent?.kind === 'delayed' && frame.kind === 'delayed-batch')
        return {
          playerId: frame.effects.find(effect => effect.id === intent.effectId)!.playerId,
          kind: 'delayed',
        };
      if (intent?.kind === 'trigger' && frame.kind === 'trigger-batch')
        return {
          playerId: frame.triggers.find(trigger => trigger.id === intent.triggerId)!.playerId,
          kind: 'trigger',
        };
      return null;
    }
    default:
      return null;
  }
}

export function frameSelection(state: GameState, frame: Frame, playerId: string) {
  if (frame.kind === 'special-play-payment')
    return {
      cards: frame.cards.map(card => card.instanceId),
      min: frame.min,
      max: Math.min(frame.max, frame.cards.length),
    };
  if (frame.kind === 'unit-tax') return taxSelection(state, frame);
  if (frame.kind === 'arrange-deck') return arrangeSelection(frame);
  if (frame.kind === 'effect' && frame.effect.kind === 'damage-chosen-bases')
    return { cards: state.seats.map(p => state.players[p]!.base), min: 0, max: state.seats.length };
  if (frame.kind === 'ability-payment') return abilityPaymentSelection(state, frame);
  if (frame.kind === 'exploit-payment') return exploitSelection(state);
  if (frame.kind === 'credit-payment') return creditSelection(state, frame);
  if (frame.kind === 'disclose') return disclosureSelection(state, frame);
  if (frame.kind === 'plot-reveal')
    return { cards: frame.cards.map(c => c.instanceId), min: 0, max: frame.cards.length };
  if (frame.kind === 'zone-inspection') return inspectionSelection(state, frame);
  if (frame.kind === 'zone-search') return zoneSearchSelection(state, frame);
  if (frame.kind === 'allocate-benefit') return benefitSelection(state, frame);
  if (frame.kind === 'allocate-damage') {
    const cards = matchingUnits(state, frame.playerId, frame.filter, frame).map(c => c.instanceId);
    return {
      cards,
      min: frame.upTo ? 0 : frame.amount,
      max: frame.amount,
      allocation: { limits: Object.fromEntries(cards.map(id => [id, frame.amount])) },
    };
  }
  if (frame.kind === 'allocate-indirect') return indirectSelection(state, frame);
  if (frame.kind === 'search') return searchSelection(state, frame);
  if (
    frame.kind === 'effect' &&
    (frame.effect.kind === 'select-upgrades' || frame.effect.kind === 'select-resources')
  ) {
    const effect = frame.effect;
    const cards =
      effect.kind === 'select-upgrades'
        ? matchingUpgrades(state, frame.playerId, effect.filter, frame).map(c => c.instanceId)
        : state.players[
            effect.player === 'self' ? frame.playerId : opponent(state, frame.playerId)
          ]!.resources.filter(
            id => effect.exhausted === 'any' || state.cards[id]!.exhausted === effect.exhausted,
          );
    return {
      cards,
      min:
        effect.min === 'all'
          ? cards.length
          : Math.min(Math.max(0, numericValue(state, frame, effect.min)), cards.length),
      max:
        effect.max === 'all'
          ? cards.length
          : Math.min(Math.max(0, numericValue(state, frame, effect.max)), cards.length),
    };
  }
  if (frame.kind === 'effect' && frame.effect.kind === 'defeat-credits') {
    const cards = credits(state, frame.playerId).map(c => c.instanceId);
    return { cards, min: 0, max: cards.length };
  }
  if (frame.kind === 'effect' && frame.effect.kind === 'defeat-tokens') {
    const cards = costCards(state, frame.source, { kind: 'defeat-friendly-token' }).map(
      c => c.instanceId,
    );
    return { cards, min: 0, max: cards.length };
  }
  if (frame.kind === 'effect' && frame.effect.kind === 'select-units') {
    const units = matchingUnits(state, playerId, frame.effect.filter, frame);
    const costs = Object.fromEntries(
      units.map(card => [
        card.instanceId,
        frame.effect.kind === 'select-units' && frame.effect.budget
          ? frame.effect.budget.stat === 'power'
            ? unitStats(state, card).power
            : printedCost(state, card)
          : Math.max(0, unitStats(state, card).hp - card.damage),
      ]),
    );
    return {
      cards: units.map(card => card.instanceId),
      min: Math.min(Math.max(0, numericValue(state, frame, frame.effect.min ?? 0)), units.length),
      max: Math.min(
        Math.max(0, numericValue(state, frame, frame.effect.max ?? units.length)),
        units.length,
      ),
      ...((frame.effect.budget?.max ?? frame.effect.remainingHpBudget) === undefined
        ? {}
        : {
            budget: {
              stat: frame.effect.budget?.stat ?? 'remaining-hp',
              max: frame.effect.budget
                ? numericValue(state, frame, frame.effect.budget.max)
                : frame.effect.remainingHpBudget!,
              costs,
            },
          }),
    };
  }
  if (
    frame.kind === 'effect' &&
    frame.effect.kind === 'damage-units' &&
    frame.effect.max !== undefined
  ) {
    const cards = matchingUnits(state, frame.playerId, frame.effect.filter, frame).map(
      card => card.instanceId,
    );
    const max = Math.min(Math.max(0, numericValue(state, frame, frame.effect.max)), cards.length);
    return { cards, min: frame.effect.mandatory ? max : 0, max };
  }
  if (frame.kind === 'resource')
    return {
      cards: [...state.players[playerId]!.hand],
      min: frame.setup ? 2 : 0,
      max: frame.setup ? 2 : Math.min(1, state.players[playerId]!.hand.length),
    };
  return null;
}
