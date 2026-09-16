import { hmwUnit } from './define.ts';

export const hmwSandoAquaMonster = hmwUnit('sando-aqua-monster', {
  keywords: ['Grit'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      condition: { kind: 'controls-base-trait', trait: 'Naboo' },
      effects: [
        {
          kind: 'select-units',
          filter: { arena: 'ground' },
          bind: 'defeated',
          min: 0,
          budget: {
            stat: 'power',
            max: { kind: 'unit-stat', target: 'source', stat: 'power' },
          },
          effects: [
            {
              kind: 'with-value',
              name: 'combined-power',
              value: { kind: 'group-stat-sum', group: 'defeated', stat: 'power' },
              effects: [
                {
                  kind: 'defeat-group',
                  group: 'defeated',
                  countAs: 'defeated-count',
                  effects: [
                    {
                      kind: 'damage-target',
                      target: 'source',
                      amount: { kind: 'value', name: 'combined-power' },
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
