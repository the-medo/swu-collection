import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 conditional ability fixture.
export const millenniumFalconBucketOfBolts = {
  cardId: 'millennium-falcon--bucket-of-bolts',
  name: 'Millennium Falcon, Bucket of Bolts',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Transport'],
  unique: true,
  cost: 7,
  power: 5,
  hp: 6,
  arena: 'space',
  triggers: [
    {
      id: 'ready',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'own-base-more-damaged',
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'ready',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
