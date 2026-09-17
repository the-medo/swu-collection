import { hmwUpgrade } from './define.ts';

export const hmwBoomaBall = hmwUpgrade('booma-ball', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-upgrades',
          filter: {
            maxCost: 3,
          },
          min: 0,
          max: 1,
          bind: 'upgrades',
          effects: [
            {
              kind: 'move-upgrades',
              group: 'upgrades',
              to: 'hand',
            },
          ],
        },
      ],
    },
  ],
});
