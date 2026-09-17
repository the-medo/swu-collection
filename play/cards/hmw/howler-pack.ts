import { hmwUnit } from './define.ts';

export const hmwHowlerPack = hmwUnit('howler-pack', {
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
      ],
    },
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'beast',
          count: 1,
        },
      ],
    },
  ],
});
