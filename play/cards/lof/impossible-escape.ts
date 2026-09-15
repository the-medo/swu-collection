import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const impossibleEscape = {
  cardId: 'impossible-escape',
  name: 'Impossible Escape',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Force'],
  cost: 1,
  effects: [
    {
      kind: 'choose-mode',
      options: [
        {
          id: 'exhaust-a-unit',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
              },
              bind: 'chosen',
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'exhaust',
                  },
                  ifYouDo: [
                    {
                      kind: 'select-unit',
                      filter: {
                        controller: 'enemy',
                      },
                      bind: 'chosen',
                      optional: false,
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'exhaust',
                          },
                        },
                      ],
                    },
                    {
                      kind: 'draw-cards',
                      amount: 1,
                    },
                  ],
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
                  filter: {
                    controller: 'enemy',
                  },
                  bind: 'chosen',
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'exhaust',
                      },
                    },
                  ],
                },
                {
                  kind: 'draw-cards',
                  amount: 1,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
