import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-final.json.
export const vermillionQiRaSAuctionHouse = {
  cardId: 'vermillion--qi-ra-s-auction-house',
  name: "Vermillion, Qi'ra's Auction House",
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 6,
  power: 5,
  hp: 7,
  arena: 'space',
  triggers: [
    {
      id: 'attack-ended',
      timing: 'attack-ended',
      condition: {
        kind: 'value-at-least',
        name: 'survived',
        amount: 1,
      },
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'your-deck',
              effects: [
                {
                  kind: 'reveal-top',
                  player: 'self',
                  bind: 'revealed',
                  effects: [
                    {
                      kind: 'choose-mode',
                      options: [
                        {
                          id: 'play-yourself',
                          effects: [
                            {
                              kind: 'play-card',
                              from: 'deck',
                              player: 'self',
                              filter: {},
                              target: 'revealed',
                              takeControl: true,
                              free: true,
                              optional: true,
                              effects: [
                                {
                                  kind: 'create-credits',
                                  amount: {
                                    kind: 'card-cost',
                                    target: 'revealed',
                                  },
                                  player: 'enemy',
                                },
                              ],
                            },
                          ],
                        },
                        {
                          id: 'opponent-plays',
                          effects: [
                            {
                              kind: 'play-card',
                              from: 'deck',
                              player: 'enemy',
                              filter: {},
                              target: 'revealed',
                              takeControl: true,
                              free: true,
                              optional: true,
                              effects: [
                                {
                                  kind: 'create-credits',
                                  amount: {
                                    kind: 'card-cost',
                                    target: 'revealed',
                                  },
                                  player: 'self',
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
            {
              id: 'opponent-deck',
              effects: [
                {
                  kind: 'reveal-top',
                  player: 'enemy',
                  bind: 'revealed',
                  effects: [
                    {
                      kind: 'choose-mode',
                      options: [
                        {
                          id: 'play-yourself',
                          effects: [
                            {
                              kind: 'play-card',
                              from: 'deck',
                              player: 'self',
                              filter: {},
                              target: 'revealed',
                              takeControl: true,
                              free: true,
                              optional: true,
                              effects: [
                                {
                                  kind: 'create-credits',
                                  amount: {
                                    kind: 'card-cost',
                                    target: 'revealed',
                                  },
                                  player: 'enemy',
                                },
                              ],
                            },
                          ],
                        },
                        {
                          id: 'opponent-plays',
                          effects: [
                            {
                              kind: 'play-card',
                              from: 'deck',
                              player: 'enemy',
                              filter: {},
                              target: 'revealed',
                              takeControl: true,
                              free: true,
                              optional: true,
                              effects: [
                                {
                                  kind: 'create-credits',
                                  amount: {
                                    kind: 'card-cost',
                                    target: 'revealed',
                                  },
                                  player: 'self',
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
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
