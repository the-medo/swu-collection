import { hmwEvent } from './define.ts';

export const hmwDragonSMight = hmwEvent('dragon-s-might', [
  {
    kind: 'defeat-unit',
    filter: {
      nonLeader: true,
      powerAtMost: 4,
    },
    optional: false,
  },
]);
