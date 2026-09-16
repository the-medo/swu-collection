import { isUpgrade } from './roles.ts';
import { isUnit } from './attachments.ts';
import type { CardInstance, CardReference, GameState } from './model.ts';
export type EffectContext = {
  playerId?: string;
  source: CardInstance;
  origin?: import('./model.ts').AbilityOrigin;
  bindings?: Record<string, CardReference>;
  groups?: Record<string, CardReference[]>;
  values?: Record<string, number>;
  names?: Record<string, string>;
};
export function boundReference(
  context: EffectContext | undefined,
  name: string,
  state?: GameState,
): CardReference | undefined {
  if (!context) return;
  if (name === 'source') return context.source;
  if (name === 'own-deck-top' && state) {
    const id = state.players[context.playerId ?? context.source.controller]!.deck[0];
    const card = id && state.cards[id];
    return card
      ? {
          instanceId: card.instanceId,
          incarnation: card.incarnation,
          visibility: card.visibility,
          cardId: card.cardId,
        }
      : undefined;
  }
  if (name === 'attached' && state) {
    const parent = context.source.attachedTo,
      current = parent && state.cards[parent.instanceId];
    if (current)
      return {
        instanceId: current.instanceId,
        cardId: current.cardId,
        incarnation: parent!.incarnation,
        visibility: current.visibility,
      };
  }
  return context.bindings?.[name];
}
export function boundArena(
  state: GameState,
  context: EffectContext,
  name: string,
): 'ground' | 'space' | undefined {
  const ref = boundReference(context, name, state);
  const card = ref && state.cards[ref.instanceId];
  if (
    card &&
    card.incarnation === ref!.incarnation &&
    (card.zone === 'ground' || card.zone === 'space')
  )
    return card.zone;
  const arena =
    ref &&
    [...state.departedUnits, ...state.departedUpgrades].find(
      d => d.reference.instanceId === ref.instanceId && d.reference.incarnation === ref.incarnation,
    )?.arena;
  return arena === 'ground' || arena === 'space' ? arena : undefined;
}
export function boundUnit(
  state: GameState,
  context: EffectContext,
  name: string,
): CardInstance | undefined {
  if (name === 'attached') {
    const source = state.cards[context.source.instanceId];
    const parent = source?.incarnation === context.source.incarnation && source.attachedTo;
    const unit = parent && state.cards[parent.instanceId];
    return unit && unit.incarnation === parent.incarnation ? unit : undefined;
  }
  const ref = boundReference(context, name),
    unit = ref && state.cards[ref.instanceId];
  return unit && unit.incarnation === ref.incarnation ? unit : undefined;
}

// Control is last known information after a unit leaves play. Ownership and
// the physical card's reset controller must not replace that earlier controller.
export function boundController(
  state: GameState,
  context: EffectContext,
  name: string,
): string | undefined {
  const ref = boundReference(context, name, state),
    card = ref && state.cards[ref.instanceId];
  if (!ref) return;
  if (
    card &&
    card.incarnation === ref.incarnation &&
    (isUnit(state, card) || isUpgrade(state, card))
  )
    return card.controller;
  return [...state.departedUnits, ...state.departedUpgrades].find(
    d => d.reference.instanceId === ref.instanceId && d.reference.incarnation === ref.incarnation,
  )?.controller;
}

export const contextController = (context: EffectContext) =>
  context.playerId ?? context.source.controller;
