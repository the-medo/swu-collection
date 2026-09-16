import { hmwLeader } from './define.ts';

export const hmwOshaHauntedByHerPast = hmwLeader('osha--haunted-by-her-past', {
  leader: {
    actions: [
      {
        id: 'resource-play',
        condition: {
          kind: 'unit-history-at-least',
          event: 'defeated',
          player: 'self',
          aspect: 'Heroism',
          amount: 1,
        },
        costs: [
          {
            kind: 'exhaust-self',
          },
        ],
        limit: null,
        effects: [
          {
            kind: 'play-card',
            from: 'resources',
            filter: {
              kind: 'unit',
              aspect: 'Villainy',
            },
            ignoreAspectPenalties: ['Villainy'],
            optional: false,
            effects: [
              {
                kind: 'inspect-zone',
                zone: 'hand',
                player: 'self',
                chooser: 'self',
                filter: {},
                min: 0,
                max: 1,
                bind: 'resource',
                effects: [
                  {
                    kind: 'resource-cards',
                    group: 'resource',
                    ready: false,
                    countAs: 'resourced',
                    effects: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  unit: {
    keywords: ['Saboteur'],
    actions: [
      {
        id: 'resource-play',
        costs: [],
        limit: null,
        effects: [
          {
            kind: 'play-card',
            from: 'resources',
            filter: {
              kind: 'unit',
              aspect: 'Villainy',
            },
            ignoreAspectPenalties: ['Villainy'],
            optional: false,
            effects: [
              {
                kind: 'inspect-zone',
                zone: 'hand',
                player: 'self',
                chooser: 'self',
                filter: {},
                min: 0,
                max: 1,
                bind: 'resource',
                effects: [
                  {
                    kind: 'resource-cards',
                    group: 'resource',
                    ready: false,
                    countAs: 'resourced',
                    effects: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
});
