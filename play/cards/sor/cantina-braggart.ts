import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetCantinaBraggart = {
  cardId: 'cantina-braggart',
  name: 'Cantina Braggart',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Underworld'],
  cost: 1,
  power: 0,
  hp: 3,
  arena: 'ground',
  raid: 2,
} as const satisfies UnitDefinition;
