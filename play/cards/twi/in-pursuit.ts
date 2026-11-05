import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteInPursuit = {
  cardId: 'in-pursuit',
  name: 'In Pursuit',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Tactic'],
  cost: 0,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
        exhausted: false,
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'exhaust',
          },
          ifYouDo: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'enemy',
              },
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
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
