import { hmwUnit } from './define.ts';

export const hmwSunFacPoggleSSecond = hmwUnit('sun-fac--poggle-s-second', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
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
                abilities: {
                  keywords: ['Grit'],
                },
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
  ],
});
