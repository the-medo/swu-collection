import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetFollowerOfTheWay = {
  cardId: 'follower-of-the-way',
  name: 'Follower of The Way',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Mandalorian'],
  cost: 2,
  power: 1,
  hp: 3,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          upgraded: true,
        },
      },
      power: 1,
      hp: 1,
    },
  ],
} as const satisfies UnitDefinition;
