import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 search/combat fixture.
export const lothWolf = {
  cardId: 'loth-wolf',
  name: 'Loth-Wolf',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Creature'],
  cost: 2,
  power: 3,
  hp: 3,
  arena: 'ground',
  keywords: ['Sentinel'],
  cannotAttack: true,
} as const satisfies UnitDefinition;
