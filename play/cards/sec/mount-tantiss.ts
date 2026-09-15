import type { BaseDefinition } from '../definition.ts';

// SEC 26. Printed text is pinned in the meta foundation fixture.
export const mountTantiss = {
  cardId: 'mount-tantiss',
  name: 'Mount Tantiss',
  kind: 'base',
  aspects: ['Cunning'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
