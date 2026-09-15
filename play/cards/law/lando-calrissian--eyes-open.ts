import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 traits and choices fixture.
export const landoCalrissianEyesOpen = {
  cardId: 'lando-calrissian--eyes-open',
  name: 'Lando Calrissian, Eyes Open',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Rebel', 'Underworld'],
  unique: true,
  cost: 5,
  power: 4,
  hp: 5,
  arena: 'ground',
  keywords: ['Sentinel'],
  auras: [
    {
      id: 'defending-reduction',
      filter: {
        attackingUnit: 'source',
      },
      power: -1,
    },
  ],
} as const satisfies UnitDefinition;
