import { hmwEvent } from './define.ts';

export const hmwRenew = hmwEvent('renew', [
  {
    kind: 'select-upgrades',
    filter: {
      trait: 'Condition',
    },
    min: 0,
    max: 1,
    bind: 'upgrades',
    effects: [
      {
        kind: 'move-upgrades',
        group: 'upgrades',
        to: 'discard',
      },
    ],
  },
  {
    kind: 'heal-own-base',
    amount: 3,
  },
]);
