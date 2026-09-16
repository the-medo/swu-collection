import { hmwEvent } from './define.ts';

export const hmwEasyPrey = hmwEvent('easy-prey', [
  {
    kind: 'create-unit',
    cardId: 'beast',
    count: 1,
  },
  {
    kind: 'create-unit',
    cardId: 'beast',
    count: 1,
    player: 'enemy',
    bind: 'enemy-beast',
    effects: [
      {
        kind: 'on-unit',
        target: 'enemy-beast',
        operation: {
          kind: 'give-token',
          token: 'weakness',
          count: 1,
        },
      },
    ],
  },
]);
