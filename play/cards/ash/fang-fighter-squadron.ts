import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const fangFighterSquadron = {
  cardId: 'fang-fighter-squadron',
  name: 'Fang Fighter Squadron',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Mandalorian', 'Vehicle', 'Transport'],
  cost: 5,
  power: 5,
  hp: 5,
  arena: 'space',
  keywords: ['Support'],
} as const satisfies UnitDefinition;
