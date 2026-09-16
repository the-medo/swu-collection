import { hmwLeader } from './define.ts';

export const hmwMazKanataEclecticPirateQueen = hmwLeader('maz-kanata--eclectic-pirate-queen', {
  leader: {
    actions: [
      {
        id: 'play-unit',
        requiresPlayable: true,
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
              anyTrait: ['Fringe', 'Underworld'],
            },
            discount: 1,
            optional: false,
            bind: 'played',
            effects: [
              {
                kind: 'on-unit',
                target: 'played',
                operation: {
                  kind: 'give-token',
                  token: 'weakness',
                  count: 1,
                },
              },
            ],
          },
        ],
      },
    ],
  },
  unit: {
    keywords: ['Hidden'],
    actions: [
      {
        id: 'play-unit',
        requiresPlayable: true,
        costs: [],
        limit: null,
        effects: [
          {
            kind: 'play-card',
            from: 'hand',
            filter: {
              kind: 'unit',
              anyTrait: ['Fringe', 'Underworld'],
            },
            discount: 1,
            optional: false,
            bind: 'played',
            effects: [
              {
                kind: 'on-unit',
                target: 'played',
                operation: {
                  kind: 'give-token',
                  token: 'weakness',
                  count: 1,
                },
              },
            ],
          },
        ],
      },
    ],
  },
});
