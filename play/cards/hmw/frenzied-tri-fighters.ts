import { hmwUnit } from './define.ts';

export const hmwFrenziedTriFighters = hmwUnit('frenzied-tri-fighters', {
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
              to: 'discard',
            },
          ],
        },
      ],
    },
  ],
});
