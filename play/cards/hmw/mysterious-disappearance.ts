import { hmwEvent } from './define.ts';

export const hmwMysteriousDisappearance = hmwEvent('mysterious-disappearance', [
  {
    kind: 'choose-mode',
    options: [
      {
        id: 'self',
        effects: [
          {
            kind: 'select-unit',
            filter: {
              controller: 'friendly',
              nonLeader: true,
            },
            bind: 'chosen',
            optional: false,
            effects: [
              {
                kind: 'choose-mode',
                options: [
                  {
                    id: 'defeat',
                    effects: [
                      {
                        kind: 'on-unit',
                        target: 'chosen',
                        operation: {
                          kind: 'defeat',
                        },
                        ifYouDo: [
                          {
                            kind: 'create-unit',
                            cardId: 'beast',
                            count: 1,
                          },
                        ],
                      },
                    ],
                  },
                  {
                    id: 'decline',
                    effects: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'enemy',
        effects: [
          {
            kind: 'select-unit',
            chooser: 'enemy',
            filter: {
              controller: 'enemy',
              nonLeader: true,
            },
            bind: 'chosen',
            optional: false,
            effects: [
              {
                kind: 'choose-mode',
                options: [
                  {
                    id: 'defeat',
                    effects: [
                      {
                        kind: 'on-unit',
                        target: 'chosen',
                        operation: {
                          kind: 'defeat',
                        },
                        ifYouDo: [
                          {
                            kind: 'create-unit',
                            cardId: 'beast',
                            count: 1,
                            player: 'enemy',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    id: 'decline',
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
]);
