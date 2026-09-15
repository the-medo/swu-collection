import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const benduDoYouFearTheStorm = {
  cardId: 'bendu--do-you-fear-the-storm-',
  name: 'Bendu, Do You Fear the Storm?',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Force', 'Creature'],
  unique: true,
  cost: 8,
  power: 10,
  hp: 10,
  arena: 'ground',
  triggers: [
    {
      id: 'storm',
      timing: 'attack',
      effects: [
        {
          kind: 'damage-units',
          amount: 3,
          filter: {
            otherThan: 'source',
          },
          mandatory: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
