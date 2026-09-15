import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const tieStriker = {
  cardId: 'tie-striker',
  name: 'TIE Striker',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Fighter'],
  cost: 1,
  power: 2,
  hp: 1,
  arena: 'space',
  keywords: ['Saboteur'],
} as const satisfies UnitDefinition;
