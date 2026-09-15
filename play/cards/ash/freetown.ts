import type { BaseDefinition } from '../definition.ts';

// ASH 26. Printed text is pinned in the meta foundation fixture.
export const freetown = {
  cardId: 'freetown',
  name: 'Freetown',
  kind: 'base',
  aspects: ['Cunning'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
