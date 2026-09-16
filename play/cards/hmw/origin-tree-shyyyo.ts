import { hmwUnit } from './define.ts';

export const hmwOriginTreeShyyyo = hmwUnit('origin-tree-shyyyo', {
  restore: 1,
  playReductions: [
    {
      id: 'kashyyyk-units',
      filter: { kind: 'unit' },
      condition: { kind: 'controls-base-trait', trait: 'Kashyyyk' },
      amount: 0,
      ordinalAmounts: [1, 2, 3],
    },
  ],
});
