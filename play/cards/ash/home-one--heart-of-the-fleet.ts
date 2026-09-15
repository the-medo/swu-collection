import type { UnitDefinition } from '../definition.ts';

// ASH 065. Printed text is pinned in meta-board fixture.
export const homeOneHeartOfTheFleet = {
  cardId: 'home-one--heart-of-the-fleet',
  name: 'Home One, Heart of the Fleet',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 8,
  power: 7,
  hp: 10,
  arena: 'space',
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'each-unit',
          filter: {
            controller: 'friendly',
          },
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'heal',
                amount: 'all',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
