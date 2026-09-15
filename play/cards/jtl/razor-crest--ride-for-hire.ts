import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 traits and choices fixture.
export const razorCrestRideForHire = {
  cardId: 'razor-crest--ride-for-hire',
  name: 'Razor Crest, Ride For Hire',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Mandalorian', 'Vehicle', 'Transport'],
  unique: true,
  cost: 4,
  power: 3,
  hp: 5,
  arena: 'space',
  triggers: [
    {
      id: 'pilot-return',
      timing: 'pilot-attached',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            nonLeader: true,
            anyOf: [
              {
                maxCost: 2,
              },
              {
                maxCost: 4,
                exhausted: true,
              },
            ],
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'return-to-hand',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
