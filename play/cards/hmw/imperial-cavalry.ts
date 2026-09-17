import { hmwUnit } from './define.ts';

export const hmwImperialCavalry = hmwUnit('imperial-cavalry', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'beast',
          count: 1,
        },
        {
          kind: 'damage-unit',
          amount: 1,
          arena: 'any',
          controller: 'enemy',
          optional: false,
        },
      ],
    },
  ],
});
