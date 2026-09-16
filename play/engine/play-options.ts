import { matchingPlayModifiers } from './play-keywords.ts';
import { resourcePayment } from './resource-payment.ts';
import { exploitAllowance } from './exploit.ts';
import { sharesPlayKeyword } from './play-keywords.ts';
import { boundUnit } from './bindings.ts';
import { smuggleOptions } from './smuggle.ts';
import { matchesUnit, matchingUnits } from './targets.ts';
import { numericValue } from './values.ts';
import { cannotPlayCard } from './play-restrictions.ts';
import { namedAbilityLoss } from './naming.ts';
import { spendingPower, readyResourceCount } from './credits.ts';
import { canAttach } from './attachments.ts';
import { boundReference, type EffectContext } from './bindings.ts';
import { matchesCard } from './inspection.ts';
import { isToken } from './roles.ts';
import { cardDefinition } from '../cards/catalog.ts';
import type { CardEffect } from '../cards/definition.ts';
import type { CardInstance, GameState, Intent } from './model.ts';
import { opponent, instance, playCost } from './state.ts';

export type SpecialPlayPayment = {
  mode: 'defeat-resources' | 'damage-units' | 'bottom-discard';
  cards: CardInstance[];
  min: number;
  max: number;
  discountEach: number;
  affordable: boolean;
};

export function specialPlayPayment(
  state: GameState,
  card: CardInstance,
  actor: string,
  determinedCost: number,
): SpecialPlayPayment | undefined {
  const definition = cardDefinition(state, card.cardId);
  if (definition.kind !== 'unit' || namedAbilityLoss(state, card)) return undefined;
  const ready = spendingPower(state, actor);
  const minimumSelections = (
    maximum: number,
    discountEach: number,
    powerAfterSelection: (count: number) => number = () => ready,
  ) => {
    for (let count = 0; count <= maximum; count++)
      if (
        resourcePayment(state, actor, Math.max(0, determinedCost - count * discountEach)) <=
        powerAfterSelection(count)
      )
        return count;
    return undefined;
  };
  if (definition.defeatReadyResourceDiscount) {
    const cards = state.players[actor]!.resources.map(id => instance(state, id)).filter(
      resource => !resource.exhausted && resource.instanceId !== card.instanceId,
    );
    const min = minimumSelections(
      cards.length,
      definition.defeatReadyResourceDiscount,
      count => ready - count,
    );
    return {
      mode: 'defeat-resources',
      cards,
      min: min ?? 0,
      max: cards.length,
      discountEach: definition.defeatReadyResourceDiscount,
      affordable: min !== undefined,
    };
  }
  if (definition.damageFriendlyUnitDiscount) {
    const cards = matchingUnits(state, actor, { controller: 'friendly' });
    const min = minimumSelections(cards.length, definition.damageFriendlyUnitDiscount);
    return {
      mode: 'damage-units',
      cards,
      min: min ?? 0,
      max: cards.length,
      discountEach: definition.damageFriendlyUnitDiscount,
      affordable: min !== undefined,
    };
  }
  if (definition.bottomDiscardForPlayedAbilities) {
    const cards = state.players[actor]!.discard.map(id => instance(state, id)).filter(discarded => {
      const candidate = cardDefinition(state, discarded.cardId);
      return (
        discarded.instanceId !== card.instanceId &&
        candidate.kind === 'unit' &&
        candidate.cost <= definition.bottomDiscardForPlayedAbilities!.maxCost
      );
    });
    return {
      mode: 'bottom-discard',
      cards,
      min: 0,
      max: Math.min(definition.bottomDiscardForPlayedAbilities.max, cards.length),
      discountEach: 0,
      affordable: resourcePayment(state, actor, determinedCost) <= ready,
    };
  }
  return undefined;
}

export function pendingSpecialPayment(state: GameState) {
  const payment = state.playPayment!;
  const special =
    !payment.intent.piloting &&
    specialPlayPayment(state, payment.source, payment.playerId, payment.remaining);
  // Damage while determining cost may leave fewer units for Exploit. Permit
  // any subset here; the shared payment rollback handles an impossible result.
  return special && payment.specialBeforeExploit
    ? { ...special, min: 0, affordable: true }
    : special;
}

export function copiedPlayedAbilities(state: GameState, cards: readonly CardInstance[]) {
  const triggers = cards.flatMap((card, cardIndex) => {
    const definition = cardDefinition(state, card.cardId);
    return definition.kind === 'unit'
      ? (definition.triggers ?? [])
          .filter(trigger => trigger.timing === 'played')
          .map(trigger => ({
            id: `copied-${cardIndex}-${trigger.id}`,
            timing: 'played' as const,
            ...(trigger.optional !== undefined ? { optional: trigger.optional } : {}),
            ...(trigger.condition ? { condition: trigger.condition } : {}),
            ...(trigger.limit ? { limit: trigger.limit } : {}),
            effects: trigger.effects,
          }))
      : [];
  });
  return triggers.length ? { triggers } : undefined;
}

export function cardPlayIntents(
  state: GameState,
  card: CardInstance,
  actor: string,
  discount = 0,
  free = false,
  allowPiloting = true,
  ignoreOneColoredPenalty = false,
  normalAction = false,
  ignoreAspectPenalties: boolean | readonly import('../cards/definition.ts').Aspect[] = false,
  using?: 'plot' | 'smuggle',
  smuggle?: string,
  phaseAbilities?: import('../cards/definition.ts').SimpleAbilities,
  plotPayment?: 'other-resources',
): Intent[] {
  const definition = cardDefinition(state, card.cardId);
  if (using === 'smuggle') {
    if (card.zone !== 'resources') return [];
    if (!smuggle)
      return smuggleOptions(state, card).flatMap(cost =>
        cardPlayIntents(
          state,
          card,
          actor,
          discount,
          free,
          false,
          ignoreOneColoredPenalty,
          normalAction,
          ignoreAspectPenalties,
          using,
          cost.id,
          phaseAbilities,
        ),
      );
    if (!smuggleOptions(state, card).some(cost => cost.id === smuggle)) return [];
    allowPiloting = false;
  }
  if (
    card.controller !== actor ||
    isToken(definition) ||
    cannotPlayCard(state, card, actor, normalAction)
  )
    return [];
  const ready = spendingPower(state, actor, plotPayment ? card.instanceId : undefined);
  const result: Intent[] = [];
  if (definition.kind === 'unit' || definition.kind === 'event') {
    const baseCost = playCost(
      state,
      card,
      discount,
      undefined,
      undefined,
      ignoreOneColoredPenalty,
      ignoreAspectPenalties,
      using,
      smuggle,
      phaseAbilities,
    );
    const determinedCost = Math.max(
      0,
      baseCost - exploitAllowance(state, card, undefined, phaseAbilities, using),
    );
    const special =
      definition.kind === 'unit'
        ? specialPlayPayment(state, card, actor, free ? 0 : determinedCost)
        : undefined;
    if (
      free ||
      matchingPlayModifiers(state, card, true, using).some(m => m.optionalFreeCopy) ||
      resourcePayment(state, actor, determinedCost) <= ready ||
      (special?.affordable && (special.mode === 'bottom-discard' || (!free && baseCost > 0)))
    )
      result.push({
        kind: 'play',
        card: card.instanceId,
        ...(smuggle ? { smuggle } : {}),
        ...(plotPayment ? { plotPayment } : {}),
      });
  }
  if (
    definition.kind === 'upgrade' ||
    (definition.kind === 'unit' && allowPiloting && !namedAbilityLoss(state, card))
  ) {
    const costs =
      definition.kind === 'upgrade' ? [undefined] : (definition.piloting ?? []).map(p => p.id);
    for (const piloting of costs)
      for (const id of [
        ...state.ground,
        ...state.space,
        ...(definition.kind === 'upgrade' && definition.attachTo === 'base'
          ? [state.players[actor]!.base]
          : []),
      ]) {
        const target = instance(state, id);
        if (
          canAttach(state, card, target) &&
          (free ||
            resourcePayment(
              state,
              actor,
              Math.max(
                0,
                playCost(
                  state,
                  card,
                  discount,
                  piloting,
                  target,
                  ignoreOneColoredPenalty,
                  ignoreAspectPenalties,
                  using,
                  smuggle,
                  phaseAbilities,
                ) - exploitAllowance(state, card, id, phaseAbilities, using),
              ),
            ) <= ready)
        )
          result.push({
            kind: 'play',
            card: card.instanceId,
            target: id,
            ...(piloting ? { piloting } : {}),
            ...(smuggle ? { smuggle } : {}),
            ...(plotPayment ? { plotPayment } : {}),
          });
      }
  }
  if (
    using === 'plot' &&
    !plotPayment &&
    !free &&
    !card.exhausted &&
    readyResourceCount(state, actor, card.instanceId) > 0
  ) {
    result.push(
      ...cardPlayIntents(
        state,
        card,
        actor,
        discount,
        free,
        allowPiloting,
        ignoreOneColoredPenalty,
        normalAction,
        ignoreAspectPenalties,
        using,
        smuggle,
        phaseAbilities,
        'other-resources',
      ).filter(
        intent =>
          intent.kind === 'play' &&
          resourcePayment(
            state,
            actor,
            playCost(
              state,
              card,
              discount,
              intent.piloting,
              intent.target ? instance(state, intent.target) : undefined,
              ignoreOneColoredPenalty,
              ignoreAspectPenalties,
              using,
              smuggle,
              phaseAbilities,
            ),
          ) > 0,
      ),
    );
  }
  return result;
}
export function playActor(
  state: GameState,
  playerId: string,
  effect: Extract<CardEffect, { kind: 'play-card' }>,
  context: EffectContext,
) {
  return effect.player === 'enemy'
    ? opponent(state, playerId)
    : effect.player === 'owner'
      ? effect.target && boundReference(context, effect.target, state)
        ? state.cards[boundReference(context, effect.target, state)!.instanceId]!.owner
        : playerId
      : playerId;
}
export function nestedPlayIntents(
  state: GameState,
  playerId: string,
  effect: Extract<CardEffect, { kind: 'play-card' }>,
  context: EffectContext,
): Intent[] {
  playerId = playActor(state, playerId, effect, context);
  const ref = effect.target && boundReference(context, effect.target, state);
  const cards = effect.group
    ? (context.groups?.[effect.group] ?? []).flatMap(ref => {
        const card = state.cards[ref.instanceId];
        return card && card.incarnation === ref.incarnation && card.visibility === ref.visibility
          ? [card]
          : [];
      })
    : effect.target
      ? ref
        ? [state.cards[ref.instanceId]!].filter(
            c =>
              c.incarnation === ref.incarnation &&
              (effect.from !== 'deck' || c.visibility === ref.visibility) &&
              c.cardId === ref.cardId,
          )
        : []
      : effect.from === 'hand' || effect.from === 'discard' || effect.from === 'resources'
        ? state.players[playerId]![effect.from].map(id => instance(state, id))
        : [];
  return [
    ...cards
      .filter(
        c =>
          c.zone === effect.from &&
          (effect.from !== 'deck' ||
            state.searching.includes(c.instanceId) ||
            !!effect.target ||
            !!effect.group) &&
          matchesCard(state, c, effect.filter, context),
      )
      .flatMap(c =>
        cardPlayIntents(
          state,
          effect.takeControl ? { ...c, controller: playerId } : c,
          playerId,
          numericValue(state, context, effect.discount ?? 0),
          effect.free,
          effect.filter.kind !== 'unit',
          effect.ignoreOneColoredPenalty,
          false,
          effect.ignoreAspectPenalties,
          effect.using,
          undefined,
          effect.phaseAbilities,
        ).filter(intent => {
          if (intent.kind !== 'play') return false;
          if (effect.sharesKeywordWith) {
            const unit = boundUnit(state, context, effect.sharesKeywordWith);
            if (
              intent.target ||
              !unit ||
              !sharesPlayKeyword(state, c, unit, effect.phaseAbilities, effect.using)
            )
              return false;
          }
          if (effect.filter.playAs === 'upgrade' && !intent.target) return false;
          if (effect.filter.playAs === 'pilot' && !intent.piloting) return false;
          if (
            effect.filter.playAs === 'non-unit' &&
            !intent.target &&
            cardDefinition(state, c.cardId).kind === 'unit'
          )
            return false;
          if (
            effect.attachFilter &&
            (!intent.target ||
              !matchesUnit(
                state,
                instance(state, intent.target),
                playerId,
                effect.attachFilter,
                context,
              ))
          )
            return false;
          if (!effect.attachTo) return true;
          const host = boundReference(context, effect.attachTo, state);
          return (
            intent.kind === 'play' &&
            !!host &&
            intent.target === host.instanceId &&
            state.cards[host.instanceId]?.incarnation === host.incarnation
          );
        }),
      ),
    ...(effect.optional ||
    (!effect.requirePlay && (effect.from === 'hand' || effect.from === 'resources'))
      ? [{ kind: 'decline-effect' as const }]
      : []),
  ];
}
