import type { LeaderDefinition } from '../definition.ts';

// Printed roles and official clarifications are pinned in leader-combat.json.
export const groguCharmingCompanion = {
  cardId: 'grogu--charming-companion',
  name: 'Grogu, Charming Companion',
  kind: 'leader',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Force'],
  unique: true,
  printedCost: 4,
  faces: {
    leader: {
      triggers: [
        {
          id: 'unique-play',
          timing: 'friendly-played',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'card-ready',
                target: 'source',
              },
              effects: [
                {
                  kind: 'choose-mode',
                  options: [
                    {
                      id: 'deploy-grogu',
                      effects: [
                        {
                          kind: 'deploy',
                          as: 'unit',
                          condition: null,
                        },
                      ],
                    },
                    {
                      id: 'leave-leader',
                      effects: [],
                    },
                  ],
                },
              ],
            },
          ],
          condition: {
            kind: 'card-matches',
            target: 'subject',
            filter: {
              unique: true,
              minCost: 4,
            },
          },
        },
      ],
    },
    unit: {
      power: 0,
      hp: 3,
      arena: 'ground',
      auras: [
        {
          id: 'defending-friends',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
            defending: true,
          },
          power: 1,
        },
        {
          id: 'attacking-friends',
          filter: {
            controller: 'enemy',
            defendingAgainst: {
              controller: 'friendly',
              otherThan: 'source',
            },
          },
          power: -1,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
