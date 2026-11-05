import { ic27Unit } from './define.ts';

export const ic27SawGerreraForTheCause = ic27Unit('saw-gerrera--for-the-cause', {
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: {
                  kind: 'unit-stat',
                  target: 'chosen',
                  stat: 'power',
                },
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
