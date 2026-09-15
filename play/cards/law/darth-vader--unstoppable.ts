import type { LeaderDefinition } from '../definition.ts';

// Printed faces and revised official text are pinned in leader-reactions.json.
export const darthVaderUnstoppable = {
  cardId: 'darth-vader--unstoppable',
  name: 'Darth Vader, Unstoppable',
  kind: 'leader',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Force', 'Imperial', 'Sith'],
  unique: true,
  printedCost: 7,
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
              kind: 'discard-hand',
              count: 1,
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'select-target',
              units: {},
              bases: 'any',
              bind: 'target',
              optional: false,
              effects: [
                {
                  kind: 'damage-target',
                  target: 'target',
                  amount: 1,
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
                amount: 7,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 6,
      hp: 8,
      arena: 'ground',
      triggers: [
        {
          id: 'observe',
          timing: 'attack',
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'hand',
              player: 'self',
              chooser: 'self',
              filter: {},
              min: 0,
              max: {
                kind: 'zone-size',
                zone: 'hand',
                player: 'self',
              },
              bind: 'discard',
              group: 'discarded',
              effects: [
                {
                  kind: 'move-cards',
                  group: 'discarded',
                  from: 'hand',
                  to: 'discard',
                },
                {
                  kind: 'select-target',
                  units: {},
                  bases: 'any',
                  bind: 'target',
                  optional: false,
                  effects: [
                    {
                      kind: 'damage-target',
                      target: 'target',
                      amount: {
                        kind: 'group-size',
                        group: 'discarded',
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
  },
} as const satisfies LeaderDefinition;
