import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-finale.json.
export const aPrecariousPredicament = {
  cardId: 'a-precarious-predicament',
  name: 'A Precarious Predicament',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Trick'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'enemy',
        nonLeader: true,
      },
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'choose-mode',
          chooserOf: 'chosen',
          options: [
            {
              id: 'return-to-hand',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'return-to-hand',
                  },
                },
              ],
            },
            {
              id: 'it-could-be-worse',
              effects: [
                {
                  kind: 'choose-mode',
                  options: [
                    {
                      id: 'play-from-hand',
                      effects: [
                        {
                          kind: 'play-card',
                          from: 'hand',
                          filter: {
                            name: "It's Worse",
                          },
                          free: true,
                          optional: true,
                        },
                      ],
                    },
                    {
                      id: 'play-from-resources',
                      effects: [
                        {
                          kind: 'play-card',
                          from: 'resources',
                          filter: {
                            name: "It's Worse",
                          },
                          free: true,
                          optional: true,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
