import { ic27Unit } from './define.ts';

export const ic27AhsokaTanoNotOnMyDeathWatch = ic27Unit('ahsoka-tano--not-on-my-death-watch', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'defeat-unit',
          filter: {
            maxCost: 3,
          },
          optional: true,
        },
      ],
    },
  ],
});
