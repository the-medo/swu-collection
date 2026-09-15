import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-passives.json.
export const umbaranMobileCannon = {
  cardId: 'umbaran-mobile-cannon',
  name: 'Umbaran Mobile Cannon',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Fringe', 'Vehicle', 'Walker'],
  cost: 6,
  power: 7,
  hp: 3,
  arena: 'ground',
  damageReplacements: [
    {
      id: 'first-damage',
      target: 'self',
      operation: 'prevent',
      amount: 'all',
      firstEachPhase: true,
    },
  ],
} as const satisfies UnitDefinition;
