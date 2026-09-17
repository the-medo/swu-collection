import { hmwUnit } from './define.ts';

export const hmwMylayaRider = hmwUnit('mylaya-rider', {
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
          kind: 'heal-own-base',
          amount: 2,
        },
      ],
    },
  ],
});
