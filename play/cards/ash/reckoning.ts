import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-advanced.json.
export const reckoning = {
  cardId: 'reckoning',
  name: 'Reckoning',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Plan'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      filter: {},
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'damage',
            amount: {
              kind: 'unit-sum',
              filter: {
                controller: 'friendly',
              },
              stat: 'damage',
            },
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
