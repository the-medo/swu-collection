import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const lastWords = {
  cardId: 'last-words',
  name: 'Last Words',
  kind: 'event',
  aspects: [],
  traits: ['Learned'],
  cost: 2,
  effects: [
    {
      kind: 'if',
      condition: {
        kind: 'friendly-unit-defeated',
      },
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
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
