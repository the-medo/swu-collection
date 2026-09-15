import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const reliefRequest = {
  cardId: 'relief-request',
  name: 'Relief Request',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Law'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {},
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'heal',
            amount: 3,
          },
        },
        {
          kind: 'disclose',
          aspects: ['Vigilance'],
          effects: [
            {
              kind: 'select-unit',
              filter: {
                otherThan: 'chosen',
              },
              bind: 'second',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'second',
                  operation: {
                    kind: 'heal',
                    amount: 3,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
