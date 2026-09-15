import type { CatalogContext } from '../cards/catalog.ts';
import { cardTitle } from '../cards/catalog.ts';
import { cardDefinition } from '../cards/catalog.ts';
import type { CardReference } from './model.ts';

// Catalog identity describes the physical printing; active attributes describe
// the face that is in play. References retain the side for historical sources.
function identity(state: CatalogContext, card: CardReference) {
  const definition = cardDefinition(state, card.cardId);
  return definition.kind === 'leader' && definition.faces.alternate
    ? card.leaderSide === 'back'
      ? definition.faces.alternate
      : definition.faces.leader
    : definition;
}
export const cardName = (state: CatalogContext, card: CardReference) => identity(state, card).name;
export const cardAspects = (state: CatalogContext, card: CardReference) =>
  identity(state, card).aspects;
export const cardPrintedTraits = (state: CatalogContext, card: CardReference) =>
  identity(state, card).traits;
export function cardPrintedTitle(state: CatalogContext, card: CardReference) {
  const active = identity(state, card);
  return 'title' in active ? active.title : cardTitle(state, card.cardId);
}
