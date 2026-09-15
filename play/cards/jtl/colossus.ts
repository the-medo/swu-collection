import type { BaseDefinition } from '../definition.ts';

// JTL 021. Printed text is pinned in meta-play-costs fixture.
export const colossus = {
  cardId: 'colossus',
  name: 'Colossus',
  kind: 'base',
  aspects: ['Vigilance'],
  traits: [],
  hp: 35,
  startingHandReduction: 1,
} as const satisfies BaseDefinition;
