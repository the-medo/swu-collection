import { hmwUnit } from './define.ts';

export const hmwSoaringCanCell = hmwUnit('soaring-can-cell', {
  raid: 1,
  constant: [
    {
      condition: {
        kind: 'controls-base-trait',
        trait: 'Kashyyyk',
      },
      abilities: {
        keywords: ['Ambush'],
      },
    },
  ],
});
