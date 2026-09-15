import type { BaseDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const ancientHenge = {
  cardId: 'ancient-henge',
  name: 'Ancient Henge',
  kind: 'base',
  aspects: ['Aggression'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
