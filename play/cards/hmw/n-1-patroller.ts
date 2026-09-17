import { hmwUnit } from './define.ts';

export const hmwN1Patroller = hmwUnit('n-1-patroller', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'defeat-unit',
          filter: {
            nonLeader: true,
            remainingHpAtMost: 1,
          },
          optional: true,
        },
      ],
    },
  ],
});
