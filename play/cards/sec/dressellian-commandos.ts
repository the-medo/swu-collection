import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const dressellianCommandos = {
  cardId: 'dressellian-commandos',
  name: 'Dressellian Commandos',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Trooper'],
  cost: 5,
  power: 4,
  hp: 5,
  arena: 'ground',
  keywords: ['Ambush', 'Plot'],
} as const satisfies UnitDefinition;
