import { hmwUnit } from './define.ts';

export const hmwRyykBlademaster = hmwUnit('ryyk-blademaster', {
  constant: [
    {
      condition: {
        kind: 'numeric-at-least',
        value: {
          kind: 'zone-size',
          zone: 'resources',
          player: 'self',
        },
        amount: 6,
      },
      abilities: {
        keywords: ['Ambush', 'Overwhelm'],
      },
    },
  ],
});
