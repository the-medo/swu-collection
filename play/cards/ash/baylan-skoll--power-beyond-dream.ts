import type { LeaderDefinition } from '../definition.ts';

// Printed roles and official clarifications are pinned in leader-combat.json.
export const baylanSkollPowerBeyondDream = {
  cardId: 'baylan-skoll--power-beyond-dream',
  name: 'Baylan Skoll, Power Beyond Dream',
  kind: 'leader',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Force'],
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
              },
              effects: [
                {
                  kind: 'if',
                  condition: {
                    kind: 'units-at-most',
                    amount: 1,
                    filter: {
                      controller: 'friendly',
                      sameArenaAs: 'chosen',
                    },
                  },
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'modify',
                        power: 2,
                        hp: 2,
                        duration: 'phase',
                      },
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
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
                nonLeader: true,
              },
              effects: [
                {
                  kind: 'if',
                  condition: {
                    kind: 'units-at-most',
                    amount: 1,
                    filter: {
                      controller: 'friendly',
                      nonLeader: true,
                      sameArenaAs: 'chosen',
                    },
                  },
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'modify',
                        power: 2,
                        hp: 2,
                        duration: 'phase',
                        abilities: {
                          keywords: ['Sentinel'],
                        },
                      },
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
