import { ic27Unit } from './define.ts';

export const ic27TheGhostWhaleWatching = ic27Unit('the-ghost--whale-watching', {
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'friendly-unit-base-damage',
      timing: 'friendly-unit-base-damage',
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
      ],
      condition: {
        kind: 'not',
        condition: {
          kind: 'numeric-at-least',
          value: {
            kind: 'zone-size',
            zone: 'hand',
            player: 'self',
          },
          amount: 8,
        },
      },
    },
  ],
});
