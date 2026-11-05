import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRecklessTorrent = {
  cardId: 'reckless-torrent',
  name: 'Reckless Torrent',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Republic', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 3,
  hp: 1,
  arena: 'space',
  keywords: ['Coordinate'],
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
        },
        amount: 3,
      },
      abilities: {
        triggers: [
          {
            id: 'played',
            timing: 'played',
            effects: [
              {
                kind: 'choose-mode',
                options: [
                  {
                    id: 'resolve',
                    effects: [
                      {
                        kind: 'select-unit',
                        filter: {
                          controller: 'friendly',
                        },
                        optional: false,
                        bind: 'friendly',
                        effects: [
                          {
                            kind: 'select-unit',
                            filter: {
                              controller: 'enemy',
                              sameArenaAs: 'friendly',
                            },
                            optional: false,
                            bind: 'enemy',
                            effects: [
                              {
                                kind: 'damage-bound',
                                targets: ['friendly', 'enemy'],
                                amount: 2,
                              },
                            ],
                            allowMissing: true,
                          },
                        ],
                        allowMissing: true,
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
    },
  ],
} as const satisfies UnitDefinition;
