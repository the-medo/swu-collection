import type { LeaderDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-recovery.json.
export const moffGideonIndomitableWarlord = {
  cardId: 'moff-gideon--indomitable-warlord',
  name: 'Moff Gideon, Indomitable Warlord',
  kind: 'leader',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Official'],
  unique: true,
  printedCost: 7,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'unit-history-at-least',
                event: 'defeated',
                player: 'self',
                trait: 'Imperial',
                amount: 1,
              },
              effects: [
                {
                  kind: 'play-card',
                  from: 'hand',
                  filter: {
                    kind: 'unit',
                  },
                  discount: 1,
                  optional: false,
                },
              ],
            },
          ],
        },
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              condition: {
                kind: 'resources-at-least',
                amount: 7,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 5,
      hp: 8,
      arena: 'ground',
      constant: [
        {
          condition: {
            kind: 'numeric-at-least',
            value: {
              kind: 'zone-size',
              zone: 'discard',
              player: 'self',
              filter: {
                kind: 'unit',
                trait: 'Imperial',
                printedKeyword: 'Ambush',
              },
            },
            amount: 1,
          },
          abilities: {
            keywords: ['Ambush'],
          },
        },
        {
          condition: {
            kind: 'numeric-at-least',
            value: {
              kind: 'zone-size',
              zone: 'discard',
              player: 'self',
              filter: {
                kind: 'unit',
                trait: 'Imperial',
                printedKeyword: 'Grit',
              },
            },
            amount: 1,
          },
          abilities: {
            keywords: ['Grit'],
          },
        },
        {
          condition: {
            kind: 'numeric-at-least',
            value: {
              kind: 'zone-size',
              zone: 'discard',
              player: 'self',
              filter: {
                kind: 'unit',
                trait: 'Imperial',
                printedKeyword: 'Hidden',
              },
            },
            amount: 1,
          },
          abilities: {
            keywords: ['Hidden'],
          },
        },
        {
          condition: {
            kind: 'numeric-at-least',
            value: {
              kind: 'zone-size',
              zone: 'discard',
              player: 'self',
              filter: {
                kind: 'unit',
                trait: 'Imperial',
                printedKeyword: 'Overwhelm',
              },
            },
            amount: 1,
          },
          abilities: {
            keywords: ['Overwhelm'],
          },
        },
        {
          condition: {
            kind: 'numeric-at-least',
            value: {
              kind: 'zone-size',
              zone: 'discard',
              player: 'self',
              filter: {
                kind: 'unit',
                trait: 'Imperial',
                printedKeyword: 'Saboteur',
              },
            },
            amount: 1,
          },
          abilities: {
            keywords: ['Saboteur'],
          },
        },
        {
          condition: {
            kind: 'numeric-at-least',
            value: {
              kind: 'zone-size',
              zone: 'discard',
              player: 'self',
              filter: {
                kind: 'unit',
                trait: 'Imperial',
                printedKeyword: 'Sentinel',
              },
            },
            amount: 1,
          },
          abilities: {
            keywords: ['Sentinel'],
          },
        },
        {
          condition: {
            kind: 'numeric-at-least',
            value: {
              kind: 'zone-size',
              zone: 'discard',
              player: 'self',
              filter: {
                kind: 'unit',
                trait: 'Imperial',
                printedKeyword: 'Shielded',
              },
            },
            amount: 1,
          },
          abilities: {
            keywords: ['Shielded'],
          },
        },
        {
          condition: {
            kind: 'numeric-at-least',
            value: {
              kind: 'zone-size',
              zone: 'discard',
              player: 'self',
              filter: {
                kind: 'unit',
                trait: 'Imperial',
                printedKeyword: 'Support',
              },
            },
            amount: 1,
          },
          abilities: {
            keywords: ['Support'],
          },
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
