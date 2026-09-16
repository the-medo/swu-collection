import { hmwUnit } from './define.ts';

export const hmwSurveillanceCruiser = hmwUnit('surveillance-cruiser', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      condition: {
        kind: 'any',
        conditions: [
          {
            kind: 'controls-base-trait',
            trait: 'Endor',
            player: 'enemy',
          },
          {
            kind: 'controls-base-trait',
            trait: 'Kashyyyk',
            player: 'enemy',
          },
          {
            kind: 'controls-base-trait',
            trait: 'Naboo',
            player: 'enemy',
          },
          {
            kind: 'controls-base-trait',
            trait: 'Tatooine',
            player: 'enemy',
          },
        ],
      },
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
      ],
    },
  ],
});
