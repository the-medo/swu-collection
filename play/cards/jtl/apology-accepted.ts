import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const apologyAccepted = {
  cardId: 'apology-accepted',
  name: 'Apology Accepted',
  kind: 'event',
  aspects: ['Command', 'Villainy'],
  traits: ['Tactic'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'defeat',
          },
        },
      ],
    },
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
            kind: 'give-token',
            token: 'experience',
            count: 2,
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
