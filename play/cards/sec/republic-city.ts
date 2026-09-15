import type { BaseDefinition } from '../definition.ts';

// SEC 21. Printed text is pinned in the meta foundation fixture.
export const republicCity = {
  cardId: 'republic-city',
  name: 'Republic City',
  kind: 'base',
  aspects: ['Command'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
