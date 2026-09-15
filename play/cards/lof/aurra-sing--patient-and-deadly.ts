import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const aurraSingPatientAndDeadly = {
  cardId: 'aurra-sing--patient-and-deadly',
  name: 'Aurra Sing, Patient and Deadly',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter'],
  unique: true,
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
  keywords: ['Hidden'],
  raid: 2,
} as const satisfies UnitDefinition;
