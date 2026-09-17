import { hmwUnit } from './define.ts';

export const hmwOpeeSeaKiller = hmwUnit('opee-sea-killer', {
  constant: [
    {
      condition: {
        kind: 'controls-base-trait',
        trait: 'Naboo',
      },
      abilities: {
        keywords: ['Grit'],
      },
    },
  ],
});
