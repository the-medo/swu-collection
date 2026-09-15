import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 hidden choices fixture.
export const theWillOfTheForce = {
  cardId: 'the-will-of-the-force',
  name: 'The Will of the Force',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Force'],
  cost: 4,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        nonLeader: true,
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'return-to-hand',
          },
        },
        {
          kind: 'pay',
          costs: [
            {
              kind: 'force',
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'random-discard',
              ownerOf: 'chosen',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
