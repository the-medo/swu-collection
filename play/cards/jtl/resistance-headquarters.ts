import type { BaseDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const resistanceHeadquarters = {
  cardId: 'resistance-headquarters',
  name: 'Resistance Headquarters',
  kind: 'base',
  aspects: ['Command'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
