import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteDarthMaulRevengeAtLast = {
  cardId: 'darth-maul--revenge-at-last',
  name: 'Darth Maul, Revenge At Last',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Force', 'Sith'],
  cost: 5,
  unique: true,
  power: 5,
  hp: 6,
  arena: 'ground',
  attackTwoUnits: true,
} as const satisfies UnitDefinition;
