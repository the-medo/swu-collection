import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-history.json.
export const thatSARock = {
  cardId: 'that-s-a-rock',
  name: "That's a Rock",
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Gambit'],
  cost: 1,
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
            kind: 'damage',
            amount: 1,
          },
        },
      ],
    },
  ],
  triggers: [
    {
      id: 'discarded',
      timing: 'discarded',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
