import type { EventDefinition } from '../definition.ts';

// LOF 079. Printed text is pinned in meta-force-indirect fixture.
export const shatterpoint = {
  cardId: 'shatterpoint',
  name: 'Shatterpoint',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Force'],
  cost: 4,
  effects: [
    {
      kind: 'choose-mode',
      options: [
        {
          id: 'defeat-small-unit',
          effects: [
            {
              kind: 'select-unit',
              bind: 'chosen',
              filter: {
                nonLeader: true,
                remainingHpAtMost: 3,
              },
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'defeat',
                  },
                },
              ],
            },
          ],
        },
        {
          id: 'use-the-force',
          effects: [
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
                  kind: 'select-unit',
                  bind: 'chosen',
                  filter: {
                    nonLeader: true,
                  },
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'defeat',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
