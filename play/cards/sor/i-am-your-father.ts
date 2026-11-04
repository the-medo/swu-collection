import type { EventDefinition } from '../definition.ts';

// Reprinted in IC27 185; identity and text follow the official catalog.
export const ic27ReprintIAmYourFather = {
  cardId: 'i-am-your-father',
  name: 'I Am Your Father',
  kind: 'event',
  aspects: ['Villainy'],
  traits: ['Gambit'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'enemy',
      },
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'choose-mode',
          chooserOf: 'chosen',
          options: [
            {
              id: 'take-7-damage',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'damage',
                    amount: 7,
                  },
                },
              ],
            },
            {
              id: 'no',
              effects: [
                {
                  kind: 'draw-cards',
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
