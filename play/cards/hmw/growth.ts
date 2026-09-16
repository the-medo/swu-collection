import { hmwEvent } from './define.ts';

export const hmwGrowth = hmwEvent('growth', [
  {
    kind: 'create-unit',
    cardId: 'beast',
    count: 1,
  },
  {
    kind: 'heal-own-base',
    amount: 3,
  },
  {
    kind: 'draw-cards',
    amount: 1,
  },
]);
