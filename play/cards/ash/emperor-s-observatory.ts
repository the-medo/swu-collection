import type { BaseDefinition } from '../definition.ts';

// ASH 25. Printed text is pinned in the meta foundation fixture.
export const emperorSObservatory = {
  cardId: 'emperor-s-observatory',
  name: "Emperor's Observatory",
  kind: 'base',
  aspects: ['Cunning'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
