import { ic27Unit } from './define.ts';

export const ic27DirectorKrennicArchitectOfAnnihilation = ic27Unit(
  'director-krennic--architect-of-annihilation',
  {
    actions: [
      {
        id: 'action',
        costs: [
          {
            kind: 'exhaust-self',
          },
        ],
        limit: null,
        effects: [
          {
            kind: 'play-card',
            from: 'hand',
            filter: {
              kind: 'unit',
              maxCost: 7,
            },
            optional: true,
            discount: 2,
          },
        ],
      },
    ],
  },
);
