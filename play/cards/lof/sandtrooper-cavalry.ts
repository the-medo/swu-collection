import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const sandtrooperCavalry = {
  cardId: 'sandtrooper-cavalry',
  name: 'Sandtrooper Cavalry',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Imperial', 'Creature', 'Trooper'],
  cost: 4,
  power: 2,
  hp: 6,
  arena: 'ground',
  keywords: ['Grit'],
} as const satisfies UnitDefinition;
