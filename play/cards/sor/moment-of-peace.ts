import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMomentOfPeace = {
  cardId: 'moment-of-peace',
  name: 'Moment of Peace',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Innate'],
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
            kind: 'give-token',
            token: 'shield',
            count: 1,
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
