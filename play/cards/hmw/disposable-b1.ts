import { hmwUnit } from './define.ts';

export const hmwDisposableB1 = hmwUnit('disposable-b1', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      condition: {
        kind: 'unit-history-at-least',
        event: 'entered',
        player: 'self',
        amount: 1,
        otherThan: 'source',
      },
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
      ],
    },
  ],
});
