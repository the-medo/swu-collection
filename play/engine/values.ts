import { spendingPower } from './credits.ts';
import { printedUnitStats } from './printed-stats.ts';
import { contextController } from './bindings.ts';
import { cardAspects, cardPrintedTitle } from './identity.ts';
import { conditionMatches } from './conditions.ts';
import { matchingInPlayCards } from './in-play.ts';
import { readyResourceCount, credits } from './credits.ts';
import { opponent } from './state.ts';
import { effectiveAbilities, keywordNames } from './effective-abilities.ts';
import { cardTitle } from '../cards/catalog.ts';
import type { Evaluation } from './evaluation.ts';
import { attachedUpgrades } from './attachments.ts';
import { printedCost, hasPrintedCost, matchesCard } from './inspection.ts';
import { matchingUnits } from './targets.ts';
import { cardDefinition } from '../cards/catalog.ts';
import type { NumericValue } from '../cards/definition.ts';
import { isUnit, unitStats } from './attachments.ts';
import { boundReference, type EffectContext } from './bindings.ts';
import type { GameState } from './model.ts';
export function numericValue(
  state: GameState,
  context: EffectContext,
  value: NumericValue,
  evaluation?: Evaluation,
): number {
  if (typeof value === 'number') return value;
  if (value.kind === 'spending-power')
    return spendingPower(
      state,
      value.player === 'self'
        ? contextController(context)
        : opponent(state, contextController(context)),
    );
  if (value.kind === 'ready-resources')
    return readyResourceCount(
      state,
      value.player === 'self'
        ? contextController(context)
        : opponent(state, contextController(context)),
    );
  if (value.kind === 'guarded-cards') {
    const ref = boundReference(context, value.target, state);
    return ref
      ? state.captured.filter(id => {
          const c = state.cards[id]!;
          return (
            c.capturedBy?.instanceId === ref.instanceId &&
            c.capturedBy.incarnation === ref.incarnation
          );
        }).length
      : 0;
  }
  if (value.kind === 'unit-history-count') {
    const player =
      value.player === 'self'
        ? contextController(context)
        : opponent(state, contextController(context));
    return state.phaseHistory[value.event === 'defeated' ? 'defeated' : 'defeatedAttacking'].filter(
      c => c.controller === player,
    ).length;
  }
  if (value.kind === 'difference')
    return (
      numericValue(state, context, value.left, evaluation) -
      numericValue(state, context, value.right, evaluation)
    );
  if (value.kind === 'unit-sum')
    return (
      (value.multiplier ?? 1) *
      matchingUnits(state, contextController(context), value.filter, context, evaluation).reduce(
        (total, unit) =>
          total + (value.stat === 'damage' ? unit.damage : attachedUpgrades(state, unit).length),
        0,
      )
    );
  if (value.kind === 'keyword-count') {
    const ref = boundReference(context, value.target, state),
      card = ref && state.cards[ref.instanceId];
    return card && card.incarnation === ref!.incarnation && isUnit(state, card)
      ? keywordNames(state, card, evaluation).length
      : 0;
  }
  if (value.kind === 'floor-divide')
    return Math.floor(numericValue(state, context, value.value, evaluation) / value.divisor);
  if (value.kind === 'phase-count') {
    const player =
      value.player === 'self'
        ? contextController(context)
        : opponent(state, contextController(context));
    if (value.event === 'hand-cards-discarded')
      return state.phaseHistory.discarded.filter(d => d.owner === player && d.from === 'hand')
        .length;
    return (
      state.phaseHistory[value.event === 'cards-drawn' ? 'cardsDrawn' : 'enemyBaseDamage'][
        player
      ] ?? 0
    );
  }
  if (value.kind === 'group-size') return context.groups?.[value.group]?.length ?? 0;
  if (value.kind === 'group-stat-sum')
    return (context.groups?.[value.group] ?? []).reduce((sum, ref) => {
      const card = state.cards[ref.instanceId];
      if (!card || card.incarnation !== ref.incarnation) return sum;
      return (
        sum +
        (value.stat === 'power' && isUnit(state, card)
          ? unitStats(state, card, evaluation).power
          : value.stat === 'cost'
            ? printedCost(state, card)
            : 0)
      );
    }, 0);
  if (value.kind === 'product')
    return (
      numericValue(state, context, value.left, evaluation) *
      numericValue(state, context, value.right, evaluation)
    );
  if (value.kind === 'conditional')
    return numericValue(
      state,
      context,
      conditionMatches(state, contextController(context), value.condition, context, evaluation)
        ? value.then
        : value.otherwise,
      evaluation,
    );
  if (value.kind === 'zone-size') {
    const playerId =
      value.player === 'self'
        ? contextController(context)
        : opponent(state, contextController(context));
    const original = state.players[playerId]![value.zone];
    const zone = value.filter
      ? original.filter(id => matchesCard(state, state.cards[id]!, value.filter!, context))
      : original;
    if (!value.distinctBy) return zone.length * (value.multiplier ?? 1);
    const cards = zone.map(id => state.cards[id]!);
    const size =
      value.distinctBy === 'name'
        ? new Set(cards.map(card => cardPrintedTitle(state, card))).size
        : value.distinctBy === 'cost'
          ? new Set(
              cards
                .filter(card => hasPrintedCost(state, card))
                .map(card => printedCost(state, card)),
            ).size
          : cards.length;
    return size * (value.multiplier ?? 1);
  }
  if (value.kind === 'printed-stat') {
    const ref = boundReference(context, value.target, state);
    const live = ref && state.cards[ref.instanceId];
    if (live && live.incarnation === ref!.incarnation && isUnit(state, live))
      return printedUnitStats(state, live, evaluation)[value.stat];
    const departed =
      ref &&
      state.departedUnits.find(
        d =>
          d.reference.instanceId === ref.instanceId && d.reference.incarnation === ref.incarnation,
      );
    if (departed) return value.stat === 'power' ? departed.printedPower : departed.printedHp;
    const definition = ref && cardDefinition(state, ref.cardId);
    return definition?.kind === 'unit'
      ? definition[value.stat]
      : definition?.kind === 'leader'
        ? (definition.faces.unit?.[value.stat] ?? 0)
        : 0;
  }
  if (value.kind === 'cards-in-play-count')
    return matchingInPlayCards(state, contextController(context), value.filter, context, evaluation)
      .length;
  if (value.kind === 'credits-count')
    return credits(
      state,
      value.player === 'self'
        ? contextController(context)
        : opponent(state, contextController(context)),
    ).length;
  if (value.kind === 'unit-keyword-value') {
    const ref = boundReference(context, value.target, state);
    const card = ref && state.cards[ref.instanceId];
    return card && card.incarnation === ref!.incarnation && isUnit(state, card)
      ? (effectiveAbilities(state, card, evaluation)[
          value.keyword === 'Raid' ? 'raid' : 'restore'
        ] ?? 0)
      : 0;
  }
  if (value.kind === 'in-play-aspect-icons')
    return matchingInPlayCards(
      state,
      contextController(context),
      value.filter,
      context,
      evaluation,
    ).reduce((n, card) => n + cardAspects(state, card).filter(a => a === value.aspect).length, 0);
  if (value.kind === 'unit-aspect-icons')
    return matchingUnits(
      state,
      contextController(context),
      value.filter,
      context,
      evaluation,
    ).reduce((n, c) => n + cardAspects(state, c).filter(a => a === value.aspect).length, 0);
  if (value.kind === 'force-uses-this-phase')
    return state.phaseHistory.forceUsed[contextController(context)] ?? 0;
  if (value.kind === 'cost-difference') {
    const cards = context.groups?.[value.group] ?? [];
    return cards.length === 2
      ? Math.abs(printedCost(state, cards[0]!) - printedCost(state, cards[1]!))
      : 0;
  }
  if (value.kind === 'on-attack-count') {
    const ref = boundReference(context, value.target, state),
      card = ref && state.cards[ref.instanceId];
    // V8 §7.6.15: the named On Attack abilities are distinct from keywords
    // and other abilities that happen in the same timing window.
    return card && card.incarnation === ref!.incarnation && isUnit(state, card)
      ? (effectiveAbilities(state, card, evaluation).triggers ?? []).filter(
          t => t.timing === 'attack',
        ).length
      : 0;
  }
  if (value.kind === 'distinct-aspects') {
    const ref = boundReference(context, value.target, state);
    return ref ? new Set(cardAspects(state, ref)).size : 0;
  }
  if (value.kind === 'unit-aspects')
    return new Set(
      matchingUnits(state, contextController(context), value.filter, context, evaluation).flatMap(
        c => [...cardAspects(state, c)],
      ),
    ).size;
  if (value.kind === 'base-damage-increase')
    return Math.floor(
      Math.max(
        0,
        state.cards[state.players[contextController(context)]!.base]!.damage -
          (context.values?.[value.since] ?? 0),
      ) / value.divisor,
    );
  if (value.kind === 'upgrades-count') {
    const ref = boundReference(context, value.target, state),
      unit = ref && state.cards[ref.instanceId];
    const upgrades =
      unit && unit.incarnation === ref!.incarnation && isUnit(state, unit)
        ? attachedUpgrades(state, unit)
        : value.lastKnown && ref
          ? (state.departedUnits.find(
              d =>
                d.reference.instanceId === ref.instanceId &&
                d.reference.incarnation === ref.incarnation,
            )?.upgrades ?? [])
          : [];
    return upgrades.filter(
      upgrade =>
        (!value.trait || cardDefinition(state, upgrade.cardId).traits.includes(value.trait)) &&
        (!value.cardId || upgrade.cardId === value.cardId) &&
        (!value.notCardId || upgrade.cardId !== value.notCardId),
    ).length;
  }
  if (value.kind === 'base-upgrades-count') {
    const player =
      value.player === 'self'
        ? contextController(context)
        : opponent(state, contextController(context));
    return attachedUpgrades(state, state.cards[state.players[player]!.base]!).length;
  }
  if (value.kind === 'card-cost') {
    const ref = boundReference(context, value.target, state);
    return ref ? printedCost(state, ref) : 0;
  }
  if (value.kind === 'unit-count') {
    const units = matchingUnits(
      state,
      contextController(context),
      value.filter,
      context,
      evaluation,
    );
    return value.distinctNames
      ? new Set(units.map(c => cardTitle(state, c.cardId))).size
      : units.length;
  }
  if (value.kind === 'own-base-damage')
    return Math.floor(
      state.cards[state.players[contextController(context)]!.base]!.damage / value.divisor,
    );
  if (value.kind === 'value') return (context.values?.[value.name] ?? 0) * (value.multiplier ?? 1);
  const ref = boundReference(context, value.target, state),
    card = ref && state.cards[ref.instanceId];
  if (!ref || !card) return 0;
  if (value.stat === 'damage')
    return card.incarnation === ref.incarnation && isUnit(state, card)
      ? card.damage
      : (state.departedUnits.find(
          old =>
            old.reference.instanceId === ref.instanceId &&
            old.reference.incarnation === ref.incarnation,
        )?.damage ?? 0);
  const attributes =
    card.incarnation === ref.incarnation && isUnit(state, card)
      ? { ...unitStats(state, card, evaluation), damage: card.damage }
      : state.departedUnits.find(
          old =>
            old.reference.instanceId === ref.instanceId &&
            old.reference.incarnation === ref.incarnation,
        );
  if (!attributes) return 0;
  return value.stat === 'power' ? attributes.power : Math.max(0, attributes.hp - attributes.damage);
}
