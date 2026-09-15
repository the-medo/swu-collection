import type { BaseDefinition } from '../definition.ts';

// ASH 19. Printed text is pinned in the meta foundation fixture.
export const fortressOfTheGreatMothers = {
  cardId: 'fortress-of-the-great-mothers',
  name: 'Fortress of the Great Mothers',
  kind: 'base',
  aspects: ['Vigilance'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
