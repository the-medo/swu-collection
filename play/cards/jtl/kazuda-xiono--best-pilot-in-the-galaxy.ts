import type { LeaderDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 turn and round fixture.
export const kazudaXionoBestPilotInTheGalaxy = {
  cardId: 'kazuda-xiono--best-pilot-in-the-galaxy',
  name: 'Kazuda Xiono, Best Pilot in the Galaxy',
  kind: 'leader',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Resistance', 'Pilot'],
  unique: true,
  printedCost: 4,
  faces: {
    leader: {
      actions: [
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              as: 'unit-or-upgrade',
              condition: {
                kind: 'resources-at-least',
                amount: 4,
              },
            },
          ],
        },
        {
          id: 'extra-action',
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
              optional: false,
              bind: 'chosen',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: 0,
                    hp: 0,
                    duration: 'round',
                    loseAbilities: true,
                  },
                },
              ],
              allowMissing: true,
            },
            {
              kind: 'extra-action',
            },
          ],
        },
      ],
    },
    unit: {
      power: 2,
      hp: 5,
      arena: 'ground',
      triggers: [
        {
          id: 'blank-units',
          timing: 'attack',
          effects: [
            {
              kind: 'select-units',
              filter: {
                controller: 'friendly',
              },
              bind: 'blanked',
              effects: [
                {
                  kind: 'modify-units',
                  filter: {
                    inGroup: 'blanked',
                  },
                  operation: {
                    kind: 'modify',
                    power: 0,
                    hp: 0,
                    duration: 'round',
                    loseAbilities: true,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    upgrade: {
      modifiers: {
        power: 3,
        hp: 3,
      },
      attachTo: 'friendly-vehicle-without-pilot',
      hostIsLeader: true,
      grants: {
        triggers: [
          {
            id: 'blank-units',
            timing: 'attack',
            effects: [
              {
                kind: 'select-units',
                filter: {
                  controller: 'friendly',
                },
                bind: 'blanked',
                effects: [
                  {
                    kind: 'modify-units',
                    filter: {
                      inGroup: 'blanked',
                    },
                    operation: {
                      kind: 'modify',
                      power: 0,
                      hp: 0,
                      duration: 'round',
                      loseAbilities: true,
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  },
} as const satisfies LeaderDefinition;
