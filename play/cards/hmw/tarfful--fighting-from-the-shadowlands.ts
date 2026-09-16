import { hmwLeader } from './define.ts';

export const hmwTarffulFightingFromTheShadowlands = hmwLeader(
  'tarfful--fighting-from-the-shadowlands',
  {
    leader: {
      actions: [
        {
          id: 'beast',
          costs: [
            {
              kind: 'resources',
              amount: 2,
            },
            {
              kind: 'exhaust-self',
            },
            {
              kind: 'discard-hand',
              count: 1,
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'create-unit',
              cardId: 'beast',
              count: 1,
            },
          ],
        },
      ],
    },
    unit: {
      keywords: ['Sentinel'],
      triggers: [
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'pay',
              costs: [
                {
                  kind: 'resources',
                  amount: 1,
                },
              ],
              optional: true,
              effects: [
                {
                  kind: 'create-unit',
                  cardId: 'beast',
                  count: 1,
                },
              ],
            },
          ],
        },
      ],
    },
  },
);
