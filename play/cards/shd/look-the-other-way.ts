import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteLookTheOtherWay = {
  cardId: 'look-the-other-way',
  name: 'Look the Other Way',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Trick'],
  cost: 0,
  effects: [
    {
      kind: 'select-unit',
      filter: {},
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'chosen',
            filter: {
              controller: 'friendly',
            },
          },
          effects: [
            {
              kind: 'pay',
              player: 'self',
              costs: [
                {
                  kind: 'resources',
                  amount: 2,
                },
              ],
              optional: true,
              effects: [],
              otherwise: [
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
          otherwise: [
            {
              kind: 'pay',
              player: 'enemy',
              costs: [
                {
                  kind: 'resources',
                  amount: 2,
                },
              ],
              optional: true,
              effects: [],
              otherwise: [
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
