import type { LeaderDefinition } from '../definition.ts';

// Official face text is pinned in leader-collective-ambition.json.
export const maulCollectiveAmbition = {
  cardId: 'maul--collective-ambition',
  name: 'Maul, Collective Ambition',
  kind: 'leader',
  aspects: ['Command', 'Villainy'],
  traits: ['Force', 'Underworld'],
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
              kind: 'select-unit',
              filter: {},
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'if',
                  condition: {
                    kind: 'numeric-greater',
                    left: {
                      kind: 'keyword-count',
                      target: 'chosen',
                    },
                    right: {
                      kind: 'upgrades-count',
                      target: 'chosen',
                      cardId: 'experience',
                    },
                  },
                  effects: [
                    {
                      kind: 'token-and-damage',
                      target: 'chosen',
                      token: 'experience',
                      count: 1,
                      damage: 1,
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
      hp: 9,
      arena: 'ground',
      triggers: [
        {
          id: 'deployed',
          timing: 'deployed',
          effects: [
            {
              kind: 'select-unit',
              filter: {},
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'if',
                  condition: {
                    kind: 'numeric-greater',
                    left: {
                      kind: 'keyword-count',
                      target: 'chosen',
                    },
                    right: {
                      kind: 'upgrades-count',
                      target: 'chosen',
                      cardId: 'experience',
                    },
                  },
                  effects: [
                    {
                      kind: 'token-and-damage',
                      target: 'chosen',
                      token: 'experience',
                      count: 1,
                      damage: 1,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'select-unit',
              filter: {},
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'if',
                  condition: {
                    kind: 'numeric-greater',
                    left: {
                      kind: 'keyword-count',
                      target: 'chosen',
                    },
                    right: {
                      kind: 'upgrades-count',
                      target: 'chosen',
                      cardId: 'experience',
                    },
                  },
                  effects: [
                    {
                      kind: 'token-and-damage',
                      target: 'chosen',
                      token: 'experience',
                      count: 1,
                      damage: 1,
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
