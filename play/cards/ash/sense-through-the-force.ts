import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-final.json.
export const senseThroughTheForce = {
  cardId: 'sense-through-the-force',
  name: 'Sense Through the Force',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Force'],
  cost: 2,
  effects: [
    {
      kind: 'choose-number',
      bind: 'number',
      effects: [
        {
          kind: 'search-deck',
          count: 5,
          filter: 'any',
          max: 1,
          bind: 'drawn',
          after: [
            {
              kind: 'if',
              condition: {
                kind: 'numeric-equal',
                left: {
                  kind: 'card-cost',
                  target: 'drawn',
                },
                right: {
                  kind: 'value',
                  name: 'number',
                },
              },
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    trait: 'Force',
                  },
                  bind: 'force',
                  optional: true,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'force',
                      operation: {
                        kind: 'give-token',
                        token: 'advantage',
                        count: 3,
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
