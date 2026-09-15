import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const artfulPickpocket = {
  cardId: 'artful-pickpocket',
  name: 'Artful Pickpocket',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Underworld'],
  cost: 2,
  power: 3,
  hp: 2,
  arena: 'ground',
  keywords: ['Saboteur'],
} as const satisfies UnitDefinition;
