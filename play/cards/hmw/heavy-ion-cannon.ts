import { hmwUpgrade } from './define.ts';

export const hmwHeavyIonCannon = hmwUpgrade('heavy-ion-cannon', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
      ],
    },
  ],
  grants: {
    actions: [
      {
        id: 'ion-shot',
        costs: [
          {
            kind: 'discard-hand',
            count: 1,
          },
        ],
        limit: 'once-per-phase',
        effects: [
          {
            kind: 'damage-unit',
            amount: 2,
            arena: 'any',
            optional: false,
          },
        ],
      },
    ],
  },
});
