import { ic27Unit } from './define.ts';

export const ic27TheMandalorianFromTheShadows = ic27Unit('the-mandalorian--from-the-shadows', {
  keywords: ['Shielded'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'defender',
            filter: {
              exhausted: true,
            },
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'defender',
              operation: {
                kind: 'modify',
                power: -4,
                hp: 0,
                duration: 'attack',
              },
            },
          ],
        },
      ],
    },
  ],
});
