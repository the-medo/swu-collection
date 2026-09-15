import type { LeaderDefinition } from '../definition.ts';

// Printed faces and revised official text are pinned in leader-reactions.json.
export const quiGonJinnStudentOfTheLivingForce = {
  cardId: 'qui-gon-jinn--student-of-the-living-force',
  name: 'Qui-Gon Jinn, Student of the Living Force',
  kind: 'leader',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
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
            {
              kind: 'force',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
                nonLeader: true,
              },
              bind: 'returned',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'returned',
                  operation: {
                    kind: 'return-to-hand',
                  },
                  ifYouDo: [
                    {
                      kind: 'play-card',
                      from: 'hand',
                      filter: {
                        kind: 'unit',
                        withoutAspect: 'Villainy',
                        costLessThan: {
                          kind: 'card-cost',
                          target: 'returned',
                        },
                      },
                      free: true,
                      optional: false,
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
                amount: 6,
              },
              as: 'unit',
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
          id: 'observe',
          timing: 'attack-ended',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
                nonLeader: true,
              },
              bind: 'returned',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'returned',
                  operation: {
                    kind: 'return-to-hand',
                  },
                  ifYouDo: [
                    {
                      kind: 'play-card',
                      from: 'hand',
                      filter: {
                        kind: 'unit',
                        withoutAspect: 'Villainy',
                        costLessThan: {
                          kind: 'card-cost',
                          target: 'returned',
                        },
                      },
                      free: true,
                      optional: false,
                    },
                  ],
                },
              ],
            },
          ],
          condition: {
            kind: 'value-at-least',
            name: 'survived',
            amount: 1,
          },
          optional: true,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
