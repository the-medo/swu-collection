import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const aNewOrder = {
  cardId: 'a-new-order',
  name: 'A New Order',
  kind: 'event',
  aspects: [],
  traits: ['Plan'],
  cost: 1,
  effects: [
    {
      kind: 'select-units',
      filter: {},
      max: 2,
      bind: 'targets',
      effects: [
        {
          kind: 'each-unit',
          filter: {
            inGroup: 'targets',
          },
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'advantage',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
