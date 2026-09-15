import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 observer fixture.
export const stayOnTarget = {
  cardId: 'stay-on-target',
  name: 'Stay on Target',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Tactic'],
  cost: 2,
  effects: [
    {
      kind: 'attack-with-unit',
      powerBonus: 2,
      filter: {
        trait: 'Vehicle',
      },
      grantSourceTriggers: true,
    },
  ],
  attackGrants: [
    {
      id: 'damage-draw',
      timing: 'base-damage-dealt',
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
