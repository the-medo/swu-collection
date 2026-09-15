import type { LeaderDefinition } from '../definition.ts';

// Printed faces and official clarifications are pinned in leader-costs-damage.json.
export const jabbaTheHuttWonderfulHumanBeing = {
  cardId: 'jabba-the-hutt--wonderful-human-being',
  name: 'Jabba the Hutt, Wonderful Human Being',
  kind: 'leader',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Underworld', 'Hutt'],
  unique: true,
  printedCost: 5,
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
                controller: 'friendly',
                damaged: true,
              },
              bind: 'dealer',
              optional: false,
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'enemy',
                  },
                  bind: 'chosen',
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'damage',
                        amount: {
                          kind: 'conditional',
                          condition: {
                            kind: 'unit-matches',
                            target: 'dealer',
                            filter: {
                              damageAtLeast: 3,
                            },
                          },
                          then: 2,
                          otherwise: 1,
                        },
                        source: 'dealer',
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
      power: 2,
      hp: 8,
      arena: 'ground',
      triggers: [
        {
          id: 'observe',
          timing: 'friendly-damage-survived',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'unit-matches',
                target: 'subject',
                filter: {},
              },
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'enemy',
                  },
                  bind: 'chosen',
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'damage',
                        amount: {
                          kind: 'value',
                          name: 'damage',
                        },
                        source: 'subject',
                      },
                    },
                  ],
                },
              ],
            },
          ],
          optional: true,
          limit: 'once-per-round',
          excludeSelf: true,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
