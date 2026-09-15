import type { BaseDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const amnestyHousing = {
  cardId: 'amnesty-housing',
  name: 'Amnesty Housing',
  kind: 'base',
  aspects: ['Cunning'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
