import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteUnexpectedEscape = {
  cardId: 'unexpected-escape',
  name: 'Unexpected Escape',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Trick'],
  cost: 1,
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
            kind: 'exhaust',
          },
        },
        {
          kind: 'select-captured',
          bind: 'captive',
          optional: true,
          effects: [
            {
              kind: 'rescue-captured',
              target: 'captive',
              effects: [],
            },
          ],
          guard: 'chosen',
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
