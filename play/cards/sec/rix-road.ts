import type { BaseDefinition } from '../definition.ts';

// SEC 19. Printed text is pinned in the meta foundation fixture.
export const rixRoad = {
  cardId: 'rix-road',
  name: 'Rix Road',
  kind: 'base',
  aspects: ['Vigilance'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
