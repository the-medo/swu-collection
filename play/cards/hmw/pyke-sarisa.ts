import { hmwUnit } from './define.ts';

export const hmwPykeSarisa = hmwUnit('pyke-sarisa', {
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
                  keywords: ['Sentinel'],
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
