import { hmwUnit } from './define.ts';

export const hmwPoacherSStarfighter = hmwUnit('poacher-s-starfighter', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'defeat',
          },
          ifYouDo: [
            {
              kind: 'create-unit',
              cardId: 'beast',
              count: 1,
              bind: 'beast',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'beast',
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
      optional: true,
    },
  ],
});
