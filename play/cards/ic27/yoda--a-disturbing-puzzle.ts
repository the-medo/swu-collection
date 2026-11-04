import { ic27Unit } from './define.ts';

export const ic27YodaADisturbingPuzzle = ic27Unit('yoda--a-disturbing-puzzle', {
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 0,
                hp: 0,
                duration: 'phase',
                preventCombatDamage: true,
              },
            },
          ],
        },
      ],
    },
  ],
});
