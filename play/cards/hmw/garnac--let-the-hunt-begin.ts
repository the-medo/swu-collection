import { hmwUnit } from './define.ts';

export const hmwGarnacLetTheHuntBegin = hmwUnit('garnac--let-the-hunt-begin', {
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'enemy',
          unique: true,
        },
        amount: 1,
      },
      abilities: {
        keywords: ['Hidden'],
      },
    },
  ],
  triggers: [
    {
      id: 'attack-ended',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'attack-with-unit',
          powerBonus: 0,
        },
      ],
    },
  ],
});
