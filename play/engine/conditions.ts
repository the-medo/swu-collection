import { numericValue } from './values.ts';
import { matchingInPlayCards } from './in-play.ts';
import { cardTraits, unitIsLeader } from './attributes.ts';
import { cardTitle } from '../cards/catalog.ts';
import { isUpgrade, isToken } from './roles.ts';
import type { Evaluation } from './evaluation.ts';
import { cardAspects, cardPrintedTitle } from './identity.ts';
import { printedCost, matchesCard } from './inspection.ts';
import { forceToken } from './force.ts';
import type { Condition } from '../cards/definition.ts';
import { cardDefinition } from '../cards/catalog.ts';
import { attachedUpgrades, isUnit } from './attachments.ts';
import { boundReference, boundUnit, type EffectContext } from './bindings.ts';
import { matchingUnits, matchesUnit } from './targets.ts';
import type { GameState } from './model.ts';
import { instance, opponent } from './state.ts';
export function conditionMatches(
  state: GameState,
  playerId: string,
  condition: Condition,
  context: EffectContext,
  evaluation?: Evaluation,
): boolean {
  switch (condition.kind) {
    case 'enemy-last-action-attacked-base':
      return (
        state.phaseHistory.lastActions[opponent(state, playerId)]?.basesAttacked.includes(
          playerId,
        ) ?? false
      );
    case 'discarded-this-phase': {
      const ref = boundReference(context, condition.target, state);
      return (
        !!ref &&
        state.phaseHistory.discarded.some(
          d =>
            d.owner === playerId &&
            d.card.instanceId === ref.instanceId &&
            d.card.incarnation === ref.incarnation,
        )
      );
    }
    case 'no-resources-paid': {
      const card = boundUnit(state, context, condition.target);
      return card?.resourcesPaid === 0;
    }
    case 'numeric-equal':
      return (
        numericValue(state, context, condition.left, evaluation) ===
        numericValue(state, context, condition.right, evaluation)
      );
    case 'numeric-greater':
      return (
        numericValue(state, context, condition.left, evaluation) >
        numericValue(state, context, condition.right, evaluation)
      );
    case 'numeric-at-least':
      return numericValue(state, context, condition.value, evaluation) >= condition.amount;
    case 'unit-attacked-this-action': {
      const ref = boundReference(context, condition.target, state);
      return (
        !!ref &&
        !!state.actionHistory?.attacks.some(
          a => a.instanceId === ref.instanceId && a.incarnation === ref.incarnation,
        )
      );
    }
    case 'card-role': {
      const card = boundUnit(state, context, condition.target);
      return !!card && isUpgrade(state, card);
    }
    case 'card-ready': {
      const card = boundUnit(state, context, condition.target);
      return !!card && !card.exhausted;
    }
    case 'unit-count-comparison': {
      const own = matchingUnits(
        state,
        playerId,
        { controller: 'friendly' },
        context,
        evaluation,
      ).length;
      const enemy = matchingUnits(
        state,
        playerId,
        { controller: 'enemy' },
        context,
        evaluation,
      ).length;
      return condition.relation === 'equal'
        ? own === enemy
        : condition.relation === 'more'
          ? own > enemy
          : own < enemy;
    }
    case 'played-card-this-phase': {
      const other = condition.otherThan && boundReference(context, condition.otherThan, state);
      return state.phaseHistory.played.some(play => {
        if (
          play.playerId !== playerId ||
          (other &&
            play.card.instanceId === other.instanceId &&
            play.card.incarnation === other.incarnation)
        )
          return false;
        const role = isUnit(state, play.card)
          ? 'unit'
          : isUpgrade(state, play.card)
            ? 'upgrade'
            : 'event';
        const def = cardDefinition(state, play.card.cardId);
        return (
          (!condition.filter.kind || role === condition.filter.kind) &&
          (!condition.filter.notKind || role !== condition.filter.notKind) &&
          (!condition.filter.trait || play.traits.includes(condition.filter.trait)) &&
          (!condition.filter.aspect || def.aspects.includes(condition.filter.aspect)) &&
          (!condition.filter.withoutAspect || !def.aspects.includes(condition.filter.withoutAspect))
        );
      });
    }
    case 'unit-history-at-least': {
      const controller = condition.player === 'self' ? playerId : opponent(state, playerId);
      const other = condition.otherThan && boundReference(context, condition.otherThan, state);
      return (
        state.phaseHistory[
          condition.event === 'attacked'
            ? 'attacks'
            : condition.event === 'entered'
              ? 'unitEntries'
              : condition.event === 'left'
                ? 'left'
                : 'defeated'
        ].filter(
          card =>
            (condition.player === 'any' || card.controller === controller) &&
            (condition.leader === undefined || card.leaderUnit === condition.leader) &&
            (condition.token === undefined ||
              isToken(cardDefinition(state, card.cardId)) === condition.token) &&
            (!condition.trait || card.traits.includes(condition.trait)) &&
            (!condition.aspect || cardAspects(state, card).includes(condition.aspect)) &&
            (!other ||
              card.instanceId !== other.instanceId ||
              card.incarnation !== other.incarnation),
        ).length >= condition.amount
      );
    }

    case 'round':
      return state.round === condition.number;
    case 'different-costs': {
      const [a, b] = condition.targets.map(t => boundReference(context, t, state));
      return !!a && !!b && printedCost(state, a) !== printedCost(state, b);
    }
    case 'phase-event': {
      if (condition.event === 'token-upgrade-given')
        return state.phaseHistory.tokenUpgradesGiven?.includes(playerId) ?? false;
      if (condition.event === 'enemy-base-was-damaged')
        return state.phaseHistory.basesDamaged.includes(opponent(state, playerId));
      if (condition.event === 'friendly-upgrade-defeated')
        return state.phaseHistory.upgradesDefeated.includes(playerId);
      if (condition.event === 'own-base-attacked')
        return state.phaseHistory.basesAttacked.includes(playerId);
      const history =
        condition.event === 'enemy-base-damaged'
          ? state.phaseHistory.enemyBaseDamaged
          : condition.event === 'indirect-damage'
            ? state.phaseHistory.indirectDamage
            : condition.event === 'token-created'
              ? state.phaseHistory.tokensCreated
              : state.phaseHistory.ownCardsDiscarded;
      return history.includes(playerId);
    }
    case 'played-trait-this-phase':
      return state.phaseHistory.played.some(
        play => play.playerId === playerId && condition.traits.some(t => play.traits.includes(t)),
      );
    case 'cards-played-this-phase-at-least': {
      const controller = condition.player === 'self' ? playerId : opponent(state, playerId);
      return (
        state.phaseHistory.played.filter(play => play.playerId === controller).length >=
        condition.amount
      );
    }
    case 'cards-in-play-at-least':
      return (
        matchingInPlayCards(state, playerId, condition.filter, context, evaluation).length >=
        condition.amount
      );
    case 'attacking-unit': {
      const attack = state.attacks.findLast(
        a =>
          a.attacker.instanceId === context.source.instanceId &&
          a.attacker.incarnation === context.source.incarnation,
      );
      const defender = attack && state.cards[attack.defender.instanceId];
      return (
        !!attack &&
        !!defender &&
        defender.incarnation === attack.defender.incarnation &&
        !attack.removedFromCombat.some(
          r => r.instanceId === defender.instanceId || r.instanceId === context.source.instanceId,
        ) &&
        matchesUnit(state, defender, playerId, condition.filter, context, evaluation)
      );
    }
    case 'unit-had-trait': {
      const ref = boundReference(context, condition.target, state);
      return !!ref && cardTraits(state, ref, evaluation, true).includes(condition.trait);
    }
    case 'own-base-more-damaged':
      return (
        state.cards[state.players[playerId]!.base]!.damage >
        state.cards[state.players[opponent(state, playerId)]!.base]!.damage
      );
    case 'ambush-attack':
      return (
        state.attacks.findLast(
          attack =>
            attack.attacker.instanceId === context.source.instanceId &&
            attack.attacker.incarnation === context.source.incarnation,
        )?.ambush === true
      );
    case 'attached-to-friendly-trait': {
      const ref = context.source.attachedTo;
      if (!ref) return false;
      const host = state.cards[ref.instanceId];
      if (host && host.incarnation === ref.incarnation && isUnit(state, host))
        return (
          host.controller === playerId &&
          cardTraits(state, host, evaluation).includes(condition.trait)
        );
      const departed = state.departedUnits.find(
        d =>
          d.reference.instanceId === ref.instanceId && d.reference.incarnation === ref.incarnation,
      );
      return (
        !!departed && departed.controller === playerId && departed.traits.includes(condition.trait)
      );
    }
    case 'phase':
      return state.phase === condition.phase;
    case 'leader-or-base-aspect':
      return Object.values(state.cards).some(
        card =>
          card.controller === playerId &&
          ['base', 'ground', 'space'].includes(card.zone) &&
          (['base', 'leader'].includes(cardDefinition(state, card.cardId).kind) ||
            (isUnit(state, card) && unitIsLeader(state, card, evaluation))) &&
          cardAspects(state, card).includes(condition.aspect),
      );
    case 'controls-leader-trait':
      return Object.values(state.cards).some(
        card =>
          card.controller === playerId &&
          ((card.zone === 'base' && cardDefinition(state, card.cardId).kind === 'leader') ||
            (isUnit(state, card) && unitIsLeader(state, card, evaluation))) &&
          cardTraits(state, card, evaluation).includes(condition.trait),
      );
    case 'controls-base-trait': {
      const controllers =
        condition.player === 'any'
          ? state.seats
          : [condition.player === 'enemy' ? opponent(state, playerId) : playerId];
      return controllers.some(controller => {
        const base = instance(state, state.players[controller]!.base);
        return cardTraits(state, base, evaluation).includes(condition.trait);
      });
    }
    case 'base-damage-at-least': {
      const controllers =
        condition.player === 'any'
          ? state.seats
          : [condition.player === 'enemy' ? opponent(state, playerId) : playerId];
      return controllers.some(
        controller => instance(state, state.players[controller]!.base).damage >= condition.amount,
      );
    }
    case 'own-base-upgraded':
      return attachedUpgrades(state, instance(state, state.players[playerId]!.base)).length > 0;
    case 'attacked-with-trait':
      return state.phaseHistory.attacks.some(
        card =>
          card.controller === playerId &&
          card.traits.includes(condition.trait) &&
          (!condition.nonToken || !isToken(cardDefinition(state, card.cardId))),
      );
    case 'resource-available': {
      const player =
        condition.player === 'self' ? playerId : state.seats.find(id => id !== playerId)!;
      return state.players[player]!.resources.some(
        id => state.cards[id]!.exhausted === condition.exhausted,
      );
    }
    case 'value-at-least':
      return (context.values?.[condition.name] ?? 0) >= condition.amount;
    case 'more-cards-than-opponent': {
      const player = condition.player === 'enemy' ? opponent(state, playerId) : playerId;
      return (
        state.players[player]!.hand.length > state.players[opponent(state, player)]!.hand.length
      );
    }
    case 'always':
      return true;
    case 'card-matches': {
      const ref = boundReference(context, condition.target, state);
      return !!ref && matchesCard(state, ref, condition.filter, context);
    }
    case 'fewer-resources-than-opponent':
      return (
        state.players[playerId]!.resources.length <
        state.players[state.seats.find(id => id !== playerId)!]!.resources.length
      );
    case 'force-with-you':
      return !!forceToken(state, playerId);
    case 'all':
      return condition.conditions.every(c =>
        conditionMatches(state, playerId, c, context, evaluation),
      );
    case 'any':
      return condition.conditions.some(c =>
        conditionMatches(state, playerId, c, context, evaluation),
      );
    case 'not':
      return !conditionMatches(state, playerId, condition.condition, context, evaluation);
    case 'no-other-unit-attacked': {
      const ref = boundReference(context, condition.target, state);
      return (
        !!ref &&
        !state.phaseHistory.attacks.some(
          c => c.instanceId !== ref.instanceId || c.incarnation !== ref.incarnation,
        )
      );
    }
    case 'controls-name':
      return Object.values(state.cards).some(
        c =>
          c.controller === playerId &&
          ['base', 'ground', 'space'].includes(c.zone) &&
          cardPrintedTitle(state, c) === condition.name,
      );
    case 'more-units-than-opponent':
      return (
        matchingUnits(state, playerId, { controller: 'friendly', arena: condition.arena }).length >
        matchingUnits(state, playerId, { controller: 'enemy', arena: condition.arena }).length
      );
    case 'friendly-unit-defeated':
      return state.phaseHistory.defeated.some(card => card.controller === playerId);
    case 'unit-defeated': {
      const ref = boundReference(context, condition.target, state);
      return (
        !!ref &&
        state.phaseHistory.defeated.some(
          card => card.instanceId === ref.instanceId && card.incarnation === ref.incarnation,
        )
      );
    }
    case 'attacking-damaged-unit': {
      const attack = state.attacks.findLast(
        a =>
          a.attacker.instanceId === context.source.instanceId &&
          a.attacker.incarnation === context.source.incarnation &&
          !a.removedFromCombat.some(
            ref =>
              ref.instanceId === context.source.instanceId &&
              ref.incarnation === context.source.incarnation,
          ),
      );
      const defender = attack && state.cards[attack.defender.instanceId];
      return (
        !!defender &&
        !attack!.removedFromCombat.some(
          ref => ref.instanceId === defender.instanceId && ref.incarnation === defender.incarnation,
        ) &&
        isUnit(state, defender) &&
        defender.incarnation === attack!.defender.incarnation &&
        defender.damage > 0
      );
    }
    case 'discard-aspect':
      return state.players[playerId]!.discard.some(id =>
        cardDefinition(state, instance(state, id).cardId).aspects.includes(condition.aspect),
      );
    case 'units-at-least':
      return (
        matchingUnits(state, playerId, condition.filter, context, evaluation).length >=
        condition.amount
      );
    case 'units-at-most':
      return (
        matchingUnits(state, playerId, condition.filter, context, evaluation).length <=
        condition.amount
      );
    case 'opponent-has-more-units':
      return (
        matchingUnits(state, playerId, { arena: condition.arena, controller: 'enemy' }).length >
        matchingUnits(state, playerId, { arena: condition.arena, controller: 'friendly' }).length
      );
    case 'initiative-unclaimed':
      return !state.initiative.claimed;
    case 'initiative':
      return state.initiative.holder === playerId;
    case 'unit-matches': {
      const unit = boundUnit(state, context, condition.target);
      return !!unit && matchesUnit(state, unit, playerId, condition.filter, context, evaluation);
    }
  }
}
