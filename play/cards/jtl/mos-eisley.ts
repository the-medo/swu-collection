import type { BaseDefinition } from '../definition.ts';

// JTL 30. Printed text is pinned in the meta foundation fixture.
export const mosEisley = {
  cardId: 'mos-eisley',
  name: 'Mos Eisley',
  kind: 'base',
  aspects: ['Cunning'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
