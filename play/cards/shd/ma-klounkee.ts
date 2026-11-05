import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMaKlounkee = {
  cardId: 'ma-klounkee',
  name: 'Ma Klounkee',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Underworld', 'Trick'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
        nonLeader: true,
        trait: 'Underworld',
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'return-to-hand',
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
                  amount: 3,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
