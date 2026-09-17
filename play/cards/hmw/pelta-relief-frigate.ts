import { hmwUnit } from './define.ts';

export const hmwPeltaReliefFrigate = hmwUnit('pelta-relief-frigate', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'heal-own-base',
          amount: 2,
        },
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'heal',
                amount: 2,
              },
            },
          ],
        },
      ],
    },
  ],
});
