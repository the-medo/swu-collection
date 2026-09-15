import type { LeaderDefinition } from '../definition.ts';

// Unit and upgrade roles have independent abilities. Printed text and official
// clarifications are pinned in the meta-pilot-leaders fixture.
export const lukeSkywalkerHeroOfYavin = {
  cardId: 'luke-skywalker--hero-of-yavin',
  name: 'Luke Skywalker, Hero of Yavin',
  kind: 'leader',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Force', 'Rebel', 'Pilot'],
  unique: true,
  printedCost: 6,
  faces: {
    leader: {
      actions: [
        {
          id: 'fighter-damage',
          costs: [
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'attacked-with-trait',
                trait: 'Fighter',
              },
              effects: [
                {
                  kind: 'select-unit',
                  filter: {},
                  optional: false,
                  allowMissing: true,
                  bind: 'target',
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'target',
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
                amount: 6,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 5,
      hp: 6,
      arena: 'ground',
    },
    upgrade: {
      modifiers: {
        power: 4,
        hp: 5,
      },
      attachTo: 'friendly-vehicle-without-pilot',
      hostIsLeader: true,
      enemyAbilityImmunity: ['defeat'],
      grantsIf: {
        trait: 'Fighter',
      },
      grants: {
        triggers: [
          {
            id: 'fighter-attack',
            timing: 'attack',
            effects: [
              {
                kind: 'select-unit',
                filter: {},
                optional: true,
                allowMissing: true,
                bind: 'target',
                effects: [
                  {
                    kind: 'on-unit',
                    target: 'target',
                    operation: {
                      kind: 'damage',
                      amount: 3,
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
