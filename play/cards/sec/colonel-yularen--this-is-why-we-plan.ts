import type { LeaderDefinition } from '../definition.ts';

// Printed roles and official clarifications are pinned in leader-combat.json.
export const colonelYularenThisIsWhyWePlan = {
  cardId: 'colonel-yularen--this-is-why-we-plan',
  name: 'Colonel Yularen, This Is Why We Plan',
  kind: 'leader',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Official'],
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
              effects: [
                {
                  kind: 'attack-bound',
                  target: 'first',
                  optional: false,
                  after: [
                    {
                      kind: 'select-unit',
                      filter: {
                        controller: 'friendly',
                        costLessThan: {
                          kind: 'card-cost',
                          target: 'first',
                        },
                        otherThan: 'first',
                      },
                      effects: [
                        {
                          kind: 'attack-bound',
                          target: 'second',
                          optional: false,
                        },
                      ],
                      optional: true,
                      bind: 'second',
                      forAttack: {},
                    },
                  ],
                },
              ],
              optional: false,
              bind: 'first',
              forAttack: {},
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
                amount: 5,
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
      triggers: [
        {
          id: 'completed',
          timing: 'attack-ended',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'value-at-least',
                name: 'survived',
                amount: 1,
              },
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'friendly',
                    maxCost: 4,
                    otherThan: 'source',
                  },
                  effects: [
                    {
                      kind: 'attack-bound',
                      target: 'chosen',
                      optional: false,
                    },
                  ],
                  optional: true,
                  bind: 'chosen',
                  forAttack: {},
                },
              ],
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
