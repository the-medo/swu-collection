import type { BaseDefinition } from '../definition.ts';

// JTL 31. Printed text is pinned in the meta foundation fixture.
export const lakeCountry = {
  cardId: 'lake-country',
  name: 'Lake Country',
  kind: 'base',
  aspects: [],
  traits: [],
  hp: 34,
} as const satisfies BaseDefinition;
