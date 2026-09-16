import { hmwUnit } from './define.ts';

export const hmwBatcherLoyalHound = hmwUnit('batcher--loyal-hound', {
  restore: 1,
  constant: [
    {
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          defending: true,
        },
      },
      power: 1,
    },
  ],
});
