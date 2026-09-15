import type { LeaderDefinition } from '../definition.ts';

// Printed faces and clarifications are pinned in leader-history.json.
export const boKatanKryzePrincessInExile = {
  cardId: 'bo-katan-kryze--princess-in-exile',
  name: 'Bo-Katan Kryze, Princess in Exile',
  kind: 'leader',
  aspects: ['Heroism', 'Aggression'],
  traits: ['Mandalorian'],
  unique: true,
  printedCost: 6,
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
                event: 'attacked',
                player: 'self',
                amount: 1,
                trait: 'Mandalorian',
              },
              effects: [
                {
                  kind: 'select-unit',
                  filter: {},
                  bind: 'chosen',
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'damage',
                        amount: 1,
                      },
                    },
                  ],
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
              as: 'unit',
              condition: {
                kind: 'resources-at-least',
                amount: 6,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 7,
      arena: 'ground',
      triggers: [
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'select-unit',
              filter: {},
              bind: 'chosen',
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'damage',
                    amount: 1,
                  },
                },
              ],
            },
            {
              kind: 'if',
              condition: {
                kind: 'unit-history-at-least',
                event: 'attacked',
                player: 'self',
                amount: 1,
                trait: 'Mandalorian',
                otherThan: 'source',
              },
              effects: [
                {
                  kind: 'select-unit',
                  filter: {},
                  bind: 'chosen',
                  optional: true,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'damage',
                        amount: 1,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
