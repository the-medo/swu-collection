import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const flankingTieInterceptor = {
  cardId: 'flanking-tie-interceptor',
  name: 'Flanking TIE Interceptor',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Imperial', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'space',
  keywords: ['Support'],
} as const satisfies UnitDefinition;
