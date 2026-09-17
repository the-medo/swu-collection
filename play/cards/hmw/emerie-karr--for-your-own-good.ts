import { hmwUnit } from './define.ts';

export const hmwEmerieKarrForYourOwnGood = hmwUnit('emerie-karr--for-your-own-good', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            arena: 'ground',
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: true,
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
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'damage',
                    amount: 1,
                  },
                },
                {
                  kind: 'next-play',
                  filter: {
                    kind: 'unit',
                  },
                  discount: 1,
                },
              ],
              otherwise: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'damage',
                    amount: 1,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
