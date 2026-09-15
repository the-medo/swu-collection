import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const whenHasBecomeNow = {
  cardId: 'when-has-become-now',
  name: 'When Has Become Now',
  kind: 'event',
  aspects: ['Villainy'],
  traits: ['Trick'],
  cost: 1,
  effects: [
    {
      kind: 'play-card',
      from: 'resources',
      filter: {
        hasKeyword: 'Plot',
      },
      optional: false,
      effects: [
        {
          kind: 'resource-top',
          optional: false,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
