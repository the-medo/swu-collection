import { hmwUnit } from './define.ts';

export const hmwArenaNexuStarvedForPrey = hmwUnit('arena-nexu--starved-for-prey', {
  keywords: ['Grit'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      limit: 'once-per-round',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            trait: 'Creature',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 3,
              },
              ifYouDo: [
                {
                  kind: 'on-unit',
                  target: 'source',
                  operation: {
                    kind: 'ready',
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
