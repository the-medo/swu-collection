import type { LeaderDefinition } from '../definition.ts';

// Printed faces and clarifications are pinned in leader-history.json.
export const obiWanKenobiPatientMentor = {
  cardId: 'obi-wan-kenobi--patient-mentor',
  name: 'Obi-Wan Kenobi, Patient Mentor',
  kind: 'leader',
  aspects: ['Vigilance', 'Heroism'],
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
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'heal',
                    amount: 1,
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
      hp: 7,
      arena: 'ground',
      keywords: ['Sentinel'],
      triggers: [
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
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'heal',
                    amount: 1,
                  },
                  ifYouDo: [
                    {
                      kind: 'select-unit',
                      filter: {
                        otherThan: 'chosen',
                      },
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
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
