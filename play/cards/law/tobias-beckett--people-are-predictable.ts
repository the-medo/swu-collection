import type { LeaderDefinition } from '../definition.ts';

// Printed faces and official clarifications are pinned in leader-costs-damage.json.
export const tobiasBeckettPeopleArePredictable = {
  cardId: 'tobias-beckett--people-are-predictable',
  name: 'Tobias Beckett, People are Predictable',
  kind: 'leader',
  aspects: ['Cunning', 'Vigilance'],
  traits: ['Underworld'],
  unique: true,
  printedCost: 5,
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
              filter: {
                controller: 'friendly',
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'take-control',
                    player: 'enemy',
                  },
                  ifYouDo: [
                    {
                      kind: 'create-credits',
                      amount: 1,
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
                amount: 5,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 6,
      arena: 'ground',
      triggers: [
        {
          id: 'observe',
          timing: 'deployed',
          effects: [
            {
              kind: 'select-units',
              filter: {
                controller: 'enemy',
                owner: 'self',
              },
              bind: 'owned',
              effects: [
                {
                  kind: 'defeat-group',
                  group: 'owned',
                  countAs: 'defeated',
                  effects: [
                    {
                      kind: 'create-credits',
                      amount: {
                        kind: 'value',
                        name: 'defeated',
                      },
                    },
                    {
                      kind: 'draw-cards',
                      player: 'self',
                      amount: {
                        kind: 'value',
                        name: 'defeated',
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
