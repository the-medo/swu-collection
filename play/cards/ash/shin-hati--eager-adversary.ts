import type { LeaderDefinition } from '../definition.ts';

// Printed roles and official clarifications are pinned in leader-combat.json.
export const shinHatiEagerAdversary = {
  cardId: 'shin-hati--eager-adversary',
  name: 'Shin Hati, Eager Adversary',
  kind: 'leader',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Force'],
  unique: true,
  printedCost: 6,
  faces: {
    leader: {
      triggers: [
        {
          id: 'combat-exhaust',
          timing: 'friendly-attack-ended',
          effects: [
            {
              kind: 'pay',
              costs: [
                {
                  kind: 'exhaust-self',
                },
              ],
              optional: true,
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    costLessThan: {
                      kind: 'value',
                      name: 'combat-base-damage',
                    },
                  },
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'exhaust',
                      },
                    },
                  ],
                  optional: false,
                  bind: 'chosen',
                },
              ],
            },
          ],
        },
      ],
      actions: [
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
      hp: 6,
      arena: 'ground',
      triggers: [
        {
          id: 'combat-exhaust',
          timing: 'friendly-attack-ended',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                costLessThan: {
                  kind: 'value',
                  name: 'combat-base-damage',
                },
              },
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'exhaust',
                  },
                },
              ],
              optional: false,
              bind: 'chosen',
            },
          ],
          limit: 'once-per-round',
          optional: true,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
