import type { LeaderDefinition } from '../definition.ts';

// Printed faces and clarifications are pinned in leader-history.json.
export const governorPryceTyrantOfLothal = {
  cardId: 'governor-pryce--tyrant-of-lothal',
  name: 'Governor Pryce, Tyrant of Lothal',
  kind: 'leader',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Imperial', 'Official'],
  unique: true,
  printedCost: 6,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'select-unit',
              filter: {
                token: true,
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'ready',
                  },
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
      hp: 6,
      arena: 'ground',
      constant: [
        {
          condition: {
            kind: 'always',
          },
          power: {
            kind: 'unit-count',
            filter: {
              controller: 'friendly',
              token: true,
              exhausted: false,
            },
          },
        },
      ],
      triggers: [
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'create-unit',
              cardId: 'spy',
              count: 1,
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
