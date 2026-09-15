import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const consumedByTheDarkSide = {
  cardId: 'consumed-by-the-dark-side',
  name: 'Consumed by the Dark Side',
  kind: 'event',
  aspects: ['Villainy'],
  traits: ['Force'],
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
            kind: 'give-token',
            token: 'experience',
            count: 2,
          },
        },
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'damage',
            amount: 2,
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
