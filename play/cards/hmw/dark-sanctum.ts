import { hmwUpgrade } from './define.ts';

export const hmwDarkSanctum = hmwUpgrade('dark-sanctum', {
  grants: {
    triggers: [
      {
        id: 'regroup',
        timing: 'regroup-start',
        effects: [
          {
            kind: 'draw-cards',
            amount: 1,
          },
          {
            kind: 'damage-own-base',
            amount: 2,
          },
        ],
      },
    ],
  },
});
