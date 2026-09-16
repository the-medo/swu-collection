import { hmwUpgrade } from './define.ts';

export const hmwCarboniteChamber = hmwUpgrade('carbonite-chamber', {
  actions: [
    {
      id: 'freeze',
      costs: [
        {
          kind: 'defeat-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'select-unit',
          filter: {
            withoutTrait: 'Vehicle',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 0,
                hp: 0,
                skipRegroupReady: true,
                duration: 'next-regroup',
              },
            },
          ],
        },
      ],
    },
  ],
});
