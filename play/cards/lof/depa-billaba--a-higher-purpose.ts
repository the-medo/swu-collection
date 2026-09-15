import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const depaBillabaAHigherPurpose = {
  cardId: 'depa-billaba--a-higher-purpose',
  name: 'Depa Billaba, A Higher Purpose',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  cost: 6,
  power: 5,
  hp: 7,
  arena: 'ground',
  keywords: ['Ambush', 'Saboteur'],
} as const satisfies UnitDefinition;
