import { hmwUnit } from './define.ts';

export const hmwWroshyrRebel = hmwUnit('wroshyr-rebel', {
  constant: [
    {
      condition: {
        kind: 'always',
      },
      power: {
        kind: 'floor-divide',
        value: {
          kind: 'zone-size',
          zone: 'resources',
          player: 'self',
        },
        divisor: 2,
      },
    },
  ],
});
