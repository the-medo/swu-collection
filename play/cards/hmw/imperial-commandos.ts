import { hmwUnit } from './define.ts';

export const hmwImperialCommandos = hmwUnit('imperial-commandos', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'defeat-unit',
          filter: {
            nonLeader: true,
            powerAtMost: 4,
          },
          optional: true,
        },
      ],
    },
  ],
});
