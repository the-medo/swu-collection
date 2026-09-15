import type { LeaderDefinition } from '../definition.ts';

// Printed roles and official clarifications are pinned in leader-combat.json.
export const admiralAckbarItSATrap = {
  cardId: 'admiral-ackbar--it-s-a-trap-',
  name: "Admiral Ackbar, It's A Trap!",
  kind: 'leader',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Rebel', 'Official'],
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
                nonLeader: true,
              },
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'exhaust',
                  },
                  ifYouDo: [
                    {
                      kind: 'create-unit',
                      cardId: 'x-wing',
                      count: 1,
                      creatorOf: 'chosen',
                    },
                  ],
                },
              ],
              optional: false,
              bind: 'chosen',
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
      power: 3,
      hp: 8,
      arena: 'ground',
      triggers: [
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'select-unit',
              filter: {},
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'exhaust',
                  },
                  ifYouDo: [
                    {
                      kind: 'create-unit',
                      cardId: 'x-wing',
                      count: 1,
                      creatorOf: 'chosen',
                    },
                  ],
                },
              ],
              optional: true,
              bind: 'chosen',
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
