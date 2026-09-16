import type { CatalogContext } from '../cards/catalog.ts';
import { unitIsLeader } from './attributes.ts';
import { cardDefinition } from '../cards/catalog.ts';
import type { CardDefinition, UpgradeProfile } from '../cards/definition.ts';
import type { CardInstance } from './model.ts';

export function upgradeProfile(definition: CardDefinition): UpgradeProfile | null {
  return definition.kind === 'upgrade'
    ? definition
    : definition.kind === 'unit'
      ? (definition.upgrade ?? null)
      : definition.kind === 'leader'
        ? (definition.faces.upgrade ?? null)
        : null;
}
export function historicalOwnerMatches(
  state: import('./model.ts').GameState,
  current: CardInstance,
  snapshot: CardInstance,
) {
  const definition = cardDefinition(state, current.cardId);
  return (
    state.seats.includes(snapshot.owner) &&
    (current.owner === snapshot.owner || (definition.kind === 'upgrade' && definition.token))
  );
}

export function isToken(definition: CardDefinition): boolean {
  return (
    definition.kind === 'player-token' ||
    ((definition.kind === 'unit' || definition.kind === 'upgrade') && definition.token === true)
  );
}

export function isUpgrade(state: CatalogContext, card: CardInstance): boolean {
  return (
    (card.zone === 'ground' || card.zone === 'space' || card.zone === 'base') &&
    (cardDefinition(state, card.cardId).kind === 'upgrade' || card.attachedTo !== null)
  );
}

export function exhaustibleLeaders(
  state: import('./model.ts').GameState,
  playerId: string,
): CardInstance[] {
  return Object.values(state.cards).filter(
    card =>
      card.controller === playerId &&
      !card.exhausted &&
      !card.attachedTo &&
      (cardDefinition(state, card.cardId).kind === 'leader' || unitIsLeader(state, card)) &&
      ['base', 'ground', 'space'].includes(card.zone),
  );
}
