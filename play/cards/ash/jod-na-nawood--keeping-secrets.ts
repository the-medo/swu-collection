import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const jodNaNawoodKeepingSecrets = {
  cardId: 'jod-na-nawood--keeping-secrets',
  name: 'Jod Na Nawood, Keeping Secrets',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Force', 'Underworld'],
  unique: true,
  cost: 3,
  power: 4,
  hp: 3,
  arena: 'ground',
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'exhaust-arena',
      timing: 'played',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'resources',
              amount: 4,
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'ground',
                  effects: [
                    {
                      kind: 'each-unit',
                      filter: {
                        arena: 'ground',
                      },
                      bind: 'unit',
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'unit',
                          operation: {
                            kind: 'exhaust',
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'space',
                  effects: [
                    {
                      kind: 'each-unit',
                      filter: {
                        arena: 'space',
                      },
                      bind: 'unit',
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'unit',
                          operation: {
                            kind: 'exhaust',
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
    },
  ],
} as const satisfies UnitDefinition;
