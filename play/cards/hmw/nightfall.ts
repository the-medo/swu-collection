import { hmwEvent } from './define.ts';

export const hmwNightfall = hmwEvent('nightfall', [
  {
    kind: 'damage-unit',
    amount: 1,
    arena: 'any',
    controller: 'enemy',
    optional: false,
  },
  {
    kind: 'if',
    condition: {
      kind: 'controls-base-trait',
      trait: 'Endor',
    },
    effects: [
      {
        kind: 'attack-with-unit',
        powerBonus: 2,
      },
    ],
  },
]);
