import type { LeaderDefinition } from '../definition.ts';

// Printed roles and official clarifications are pinned in leader-combat.json.
export const leiaOrganaAllianceGeneral = {
  cardId: 'leia-organa--alliance-general',
  name: 'Leia Organa, Alliance General',
  kind: 'leader',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Official'],
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
                trait: 'Rebel',
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
                        trait: 'Rebel',
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
      power: 3,
      hp: 6,
      arena: 'ground',
      raid: 1,
      triggers: [
        {
          id: 'completed',
          timing: 'attack-ended',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
                trait: 'Rebel',
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
  },
} as const satisfies LeaderDefinition;
