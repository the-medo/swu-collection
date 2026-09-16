import { hmwUnit } from './define.ts';

export const hmwKelnaccaSolitaryMaster = hmwUnit('kelnacca--solitary-master', {
  restore: 2,
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-resources',
          player: 'self',
          exhausted: false,
          min: 0,
          max: 'all',
          operation: 'exhaust',
          countAs: 'paid',
          effects: [
            {
              kind: 'repeat-effects',
              count: { kind: 'floor-divide', value: { kind: 'value', name: 'paid' }, divisor: 3 },
              effects: [
                {
                  kind: 'select-unit',
                  filter: { controller: 'enemy' },
                  bind: 'target',
                  optional: false,
                  effects: [
                    {
                      kind: 'damage-target',
                      target: 'target',
                      amount: { kind: 'unit-stat', target: 'source', stat: 'power' },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
