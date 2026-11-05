import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetCraftySmuggler = {
  cardId: 'crafty-smuggler',
  name: 'Crafty Smuggler',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'ground',
  keywords: ['Shielded'],
} as const satisfies UnitDefinition;
