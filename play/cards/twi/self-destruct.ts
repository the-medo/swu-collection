import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSelfDestruct = {
  cardId: 'self-destruct',
  name: 'Self-Destruct',
  kind: 'event',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Tactic'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'defeat',
          },
          ifYouDo: [
            {
              kind: 'select-unit',
              filter: {},
              optional: false,
              bind: 'chosen',
              effects: [
                {
                  kind: 'damage-target',
                  target: 'chosen',
                  amount: 4,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
