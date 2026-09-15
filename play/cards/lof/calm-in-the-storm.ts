import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const calmInTheStorm = {
  cardId: 'calm-in-the-storm',
  name: 'Calm in the Storm',
  kind: 'event',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Force'],
  cost: 2,
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
            kind: 'exhaust',
          },
          ifYouDo: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
            },
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
