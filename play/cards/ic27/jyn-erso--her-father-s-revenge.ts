import { ic27Unit } from './define.ts';

export const ic27JynErsoHerFatherSRevenge = ic27Unit('jyn-erso--her-father-s-revenge', {
  keywords: ['Saboteur'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-units',
          filter: {},
          bind: 'readied',
          min: 0,
          max: 3,
          budget: {
            stat: 'cost',
            max: 7,
          },
          effects: [
            {
              kind: 'ready-units',
              filter: {
                inGroup: 'readied',
              },
            },
            {
              kind: 'modify-units',
              filter: {
                inGroup: 'readied',
              },
              operation: {
                kind: 'modify',
                power: 0,
                hp: 0,
                duration: 'phase',
                abilities: {
                  keywords: ['Saboteur'],
                },
              },
            },
          ],
        },
      ],
    },
  ],
});
