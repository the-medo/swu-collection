import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const urrrKEliteSharpshooter = {
  cardId: 'urrr-k--elite-sharpshooter',
  name: "Urrr'k, Elite Sharpshooter",
  kind: 'unit',
  aspects: ['Aggression', 'Cunning'],
  traits: ['Rebel', 'Tusken', 'Bounty Hunter'],
  unique: true,
  cost: 4,
  power: 2,
  hp: 4,
  arena: 'ground',
  keywords: ['Hidden'],
  raid: 4,
} as const satisfies UnitDefinition;
