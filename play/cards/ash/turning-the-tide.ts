import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const turningTheTide = {
  cardId: 'turning-the-tide',
  name: 'Turning the Tide',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Tactic'],
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
              kind: 'unit-count',
              filter: {
                controller: 'friendly',
              },
            },
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
