import type { BaseDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const nadiriDockyards = {
  cardId: 'nadiri-dockyards',
  name: 'Nadiri Dockyards',
  kind: 'base',
  aspects: ['Aggression'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
