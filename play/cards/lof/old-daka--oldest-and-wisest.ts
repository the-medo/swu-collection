import type { UnitDefinition } from '../definition.ts';

// LOF 036. Printed text is pinned in meta-play-costs fixture.
export const oldDakaOldestAndWisest = {
  cardId: 'old-daka--oldest-and-wisest',
  name: 'Old Daka, Oldest and Wisest',
  unique: true,
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Force', 'Night'],
  cost: 5,
  power: 6,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            trait: 'Night',
            excludeName: 'Old Daka',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'defeat',
              },
            },
            {
              kind: 'play-card',
              from: 'discard',
              filter: {
                kind: 'unit',
              },
              optional: true,
              target: 'chosen',
              free: true,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
