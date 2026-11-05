import { cardDefinition, type CatalogContext } from '../cards/catalog.ts';
import type { CardDefinition } from '../cards/definition.ts';
import type { CardReference } from './model.ts';

export function instanceDefinition(state: CatalogContext, card: CardReference): CardDefinition {
  const physical = cardDefinition(state, card.cardId);
  if (!card.copiedCardId) return physical;
  const copied = cardDefinition(state, card.copiedCardId);
  if (physical.kind !== 'unit' || !physical.copyOnEntry || copied.kind !== 'unit')
    throw new Error('Invalid copied unit definition');
  // Token status belongs to the physical card, not the copied printed attributes.
  const { unique: _unique, token: _token, ...attributes } = copied;
  return {
    ...attributes,
    traits: [...new Set([...copied.traits, ...physical.copyOnEntry.traits])],
  };
}
