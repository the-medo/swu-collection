import { hmwUnit } from './define.ts';

export const hmwInvasionLander = hmwUnit('invasion-lander', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'modify-units',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          operation: {
            kind: 'modify',
            power: 2,
            hp: 2,
            duration: 'phase',
          },
        },
      ],
    },
  ],
});
