import type { BaseDefinition } from '../definition.ts';

// JTL 19. Printed text is pinned in the meta foundation fixture.
export const cityInTheClouds = {
  cardId: 'city-in-the-clouds',
  name: 'City in the Clouds',
  kind: 'base',
  aspects: ['Vigilance'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
