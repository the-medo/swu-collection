import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 conditional ability fixture.
export const salaciousCrumbCacklingCompanion = {
  cardId: 'salacious-crumb--cackling-companion',
  name: 'Salacious Crumb, Cackling Companion',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Creature'],
  unique: true,
  cost: 1,
  power: 0,
  hp: 2,
  arena: 'ground',
  raid: 2,
  entersReady: {
    kind: 'controls-name',
    name: 'Jabba the Hutt',
  },
} as const satisfies UnitDefinition;
