import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-history.json.
export const youHoldThis = {
  cardId: 'you-hold-this',
  name: 'You Hold This',
  kind: 'event',
  aspects: ['Aggression', 'Cunning'],
  traits: ['Trick'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
        nonLeader: true,
      },
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'take-control',
            player: 'enemy',
          },
          ifYouDo: [
            {
              kind: 'select-unit',
              filter: {
                otherThan: 'chosen',
                sameArenaAs: 'chosen',
              },
              bind: 'second',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'second',
                  operation: {
                    kind: 'damage',
                    amount: 4,
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
