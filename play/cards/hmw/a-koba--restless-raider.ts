import { hmwUnit } from './define.ts';

export const hmwAKobaRestlessRaider = hmwUnit('a-koba--restless-raider', {
  raid: 1,
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
                power: 2,
                hp: 0,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
  ],
});
