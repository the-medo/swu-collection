import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBravado = {
  cardId: 'bravado',
  name: 'Bravado',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Innate'],
  cost: 5,
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
            kind: 'ready',
          },
        },
      ],
    },
  ],
  costReductions: [
    {
      condition: {
        kind: 'unit-history-at-least',
        event: 'defeated',
        player: 'enemy',
        amount: 1,
        by: 'self',
      },
      amount: 2,
    },
  ],
} as const satisfies EventDefinition;
