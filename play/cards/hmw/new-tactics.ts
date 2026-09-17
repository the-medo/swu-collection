import { hmwEvent } from './define.ts';

export const hmwNewTactics = hmwEvent('new-tactics', [
  {
    kind: 'select-unit',
    filter: {
      nonLeader: true,
    },
    bind: 'chosen',
    optional: false,
    effects: [
      {
        kind: 'unit-to-deck',
        target: 'chosen',
      },
    ],
  },
]);
