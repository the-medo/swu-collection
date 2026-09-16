import { resourcePayment, abilityResourcePayment } from './resource-payment.ts';
import { isUnit } from './attachments.ts';
import { cardTraits } from './attributes.ts';
import { potentialAbilitySources } from './effective-abilities.ts';
import { paymentAbility } from './ability-payment.ts';
import { recordTokenCreation } from './phase-history.ts';
import { numericValue } from './values.ts';
import { grantedDiscardPlay } from './play-permissions.ts';
import type { ActionDefinition, CardEffect } from '../cards/definition.ts';
import { effectiveAbilities } from './effective-abilities.ts';
import type { Frame, GameState, Intent, CardInstance } from './model.ts';
import { addCard, fact, instance, move, opponent, playCost } from './state.ts';
import { plotPlay } from './plot.ts';

// Credits occupy the resource zone but never enter the ordered resource list.
export function credits(
  state: GameState,
  playerId: string,
  controller: 'self' | 'enemy' | 'any' = 'self',
) {
  return state.seats
    .filter(
      p =>
        controller === 'any' ||
        p === (controller === 'self' ? playerId : opponent(state, playerId)),
    )
    .flatMap(p => state.players[p]!.tokens.map(id => instance(state, id)))
    .filter(c => c.cardId === 'credit');
}
export function spendableCredits(state: GameState, playerId: string) {
  return credits(state, playerId).filter(card => effectiveAbilities(state, card).creditPayment);
}
export function takeCredit(
  state: GameState,
  card: CardInstance,
  playerId: string,
  source: CardInstance,
) {
  if (!credits(state, playerId, 'enemy').includes(card)) return false;
  const previous = state.players[card.controller]!.tokens;
  previous.splice(previous.indexOf(card.instanceId), 1);
  card.controller = playerId;
  state.players[playerId]!.tokens.push(card.instanceId);
  fact(state, 'control-changed', playerId, [source, card]);
  return true;
}
export function readyResourceCount(state: GameState, playerId: string, excluded?: string) {
  return state.players[playerId]!.resources.filter(
    id => id !== excluded && !instance(state, id).exhausted,
  ).length;
}
export function resourcePaymentUnits(state: GameState, playerId: string) {
  const traits = potentialAbilitySources(state, 'resourcePaymentTraits')
    .filter(c => c.controller === playerId)
    .flatMap(c => effectiveAbilities(state, c).resourcePaymentTraits ?? []);
  if (!traits.length) return [];
  return [...state.ground, ...state.space]
    .map(id => instance(state, id))
    .filter(
      c =>
        c.controller === playerId &&
        isUnit(state, c) &&
        !c.exhausted &&
        cardTraits(state, c).some(t => traits.includes(t)),
    );
}
export function alternativePayments(state: GameState, playerId: string) {
  return [...spendableCredits(state, playerId), ...resourcePaymentUnits(state, playerId)];
}
export function spendingPower(state: GameState, playerId: string, excluded?: string) {
  return (
    readyResourceCount(state, playerId, excluded) + alternativePayments(state, playerId).length
  );
}
export function abilitySpendingPower(
  state: GameState,
  source: CardInstance,
  ability: ActionDefinition,
  chosen?: CardInstance,
) {
  return (
    readyResourceCount(state, source.controller) +
    alternativePayments(state, source.controller).filter(
      c =>
        !(
          c.instanceId === source.instanceId &&
          ability.costs.some(cost => cost.kind === 'exhaust-self')
        ) &&
        !(
          c.instanceId === chosen?.instanceId &&
          (c.cardId === 'credit' ||
            ability.costs.some(cost => cost.kind === 'exhaust-friendly-unit'))
        ),
    ).length
  );
}
export function createCredits(
  state: GameState,
  playerId: string,
  amount: number,
  source?: CardInstance,
) {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('Invalid Credit count');
  return Array.from({ length: amount }, () => {
    const token = addCard(state, playerId, 'credit', 'resources');
    recordTokenCreation(state, playerId);
    fact(state, 'created', playerId, source ? [source, token] : [token]);
    return token;
  });
}
export function defeatCredit(state: GameState, token: CardInstance, actor: string) {
  if (
    token.cardId !== 'credit' ||
    token.zone !== 'resources' ||
    !state.players[token.controller]!.tokens.includes(token.instanceId)
  )
    throw new Error('Unavailable Credit');
  fact(state, 'defeated', actor, [token]);
  move(state, token, 'set-aside');
}
export function paymentAmount(
  state: GameState,
  frame: Frame,
  intent: Intent,
  actor: string,
  selections: readonly string[] = [],
  parts?: import('./state.ts').PlayCostParts,
  increased?: number,
): number {
  if (frame.kind === 'exploit-play')
    return resourcePayment(state, actor, state.playPayment?.remaining ?? 0);
  if (frame.kind === 'ability-payment')
    return paymentAmount(state, frame.continuation, frame.intent, actor);
  if (frame.kind === 'unit-tax')
    return selections.length * resourcePayment(state, actor, frame.amount);
  if (frame.kind !== 'action' && frame.kind !== 'effect') return 0;
  const effect: CardEffect | null =
    frame.kind === 'effect' ? (frame.effect.kind === 'plot-play' ? plotPlay : frame.effect) : null;
  if (intent.kind === 'play') {
    if (parts) Object.assign(parts, { increased: 0, reductions: {} });
    const permission =
      frame.kind === 'action' && grantedDiscardPlay(state, instance(state, intent.card), actor);
    if (permission && permission.free) return 0;
    if (effect && effect.kind !== 'play-card' && effect.kind !== 'play-unit') return 0;
    if (effect?.kind === 'play-card' && effect.free) return 0;
    const determined = playCost(
      state,
      { ...instance(state, intent.card), controller: actor },
      frame.kind === 'effect'
        ? numericValue(state, frame, effect?.discount ?? 0)
        : permission
          ? (permission.discount ?? 0)
          : 0,
      intent.piloting,
      intent.target ? instance(state, intent.target) : undefined,
      effect?.kind === 'play-card' && effect.ignoreOneColoredPenalty,
      (permission && permission.ignoreAspectPenalties) ||
        (effect?.kind === 'play-card' && effect.ignoreAspectPenalties),
      intent.smuggle ? 'smuggle' : effect?.kind === 'play-card' ? effect.using : undefined,
      intent.smuggle,
      effect?.kind === 'play-card'
        ? effect.phaseAbilities
        : permission
          ? permission.phaseAbilities
          : undefined,
      parts,
      increased,
    );
    return parts ? determined : resourcePayment(state, actor, determined);
  }
  if (frame.kind === 'action' && intent.kind === 'use-ability') {
    const ability = effectiveAbilities(state, instance(state, intent.card)).actions?.find(
      a => a.id === intent.abilityId,
    );
    if (!ability) throw new Error('Unknown payment ability');
    return abilityResourcePayment(state, actor, ability.costs);
  }
  if (effect?.kind === 'pay' && intent.kind === 'accept-effect')
    return abilityResourcePayment(state, actor, effect.costs);
  return 0;
}
export function creditSelection(
  state: GameState,
  frame: Extract<Frame, { kind: 'credit-payment' }>,
) {
  const continuation =
    frame.continuation.kind === 'ability-payment'
      ? frame.continuation.continuation
      : frame.continuation;
  const intent =
    frame.continuation.kind === 'ability-payment'
      ? frame.continuation.intent
      : continuation.kind === 'exploit-play' && state.playPayment
        ? state.playPayment.intent
        : frame.intent;
  const payment = paymentAbility(state, continuation, intent);
  const cards = alternativePayments(state, frame.playerId)
    .filter(
      c =>
        !(
          payment?.ability.costs.some(cost => cost.kind === 'exhaust-self') &&
          c.instanceId === payment.source.instanceId
        ) &&
        !(
          frame.continuation.kind === 'ability-payment' &&
          frame.selections.includes(c.instanceId) &&
          (c.cardId === 'credit' ||
            payment?.ability.costs.some(cost => cost.kind === 'exhaust-friendly-unit'))
        ),
    )
    .map(c => c.instanceId);
  return {
    cards,
    min: Math.max(
      0,
      frame.amount -
        readyResourceCount(
          state,
          frame.playerId,
          intent.kind === 'play' && intent.plotPayment ? intent.card : undefined,
        ),
    ),
    max: Math.min(cards.length, frame.amount),
  };
}
