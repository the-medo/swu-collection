import type { BaseDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const massassiTemple = {
  cardId: 'massassi-temple',
  name: 'Massassi Temple',
  kind: 'base',
  aspects: ['Aggression'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
