import { hmwUnit } from './define.ts';

export const hmwThirdSisterCycleOfVengeance = hmwUnit('third-sister--cycle-of-vengeance', {
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          bind: 'first',
          optional: true,
          effects: [
            { kind: 'damage-target', target: 'first', amount: 2 },
            {
              kind: 'select-unit',
              chooserOf: 'first',
              filter: {},
              bind: 'second',
              optional: true,
              effects: [
                { kind: 'damage-target', target: 'second', amount: 3 },
                {
                  kind: 'select-unit',
                  chooserOf: 'second',
                  filter: {},
                  bind: 'third',
                  optional: true,
                  effects: [{ kind: 'damage-target', target: 'third', amount: 4 }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
