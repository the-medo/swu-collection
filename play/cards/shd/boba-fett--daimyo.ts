import type { LeaderDefinition } from '../definition.ts';

// Printed faces and revised official text are pinned in leader-reactions.json.
export const bobaFettDaimyo = {
  cardId: 'boba-fett--daimyo',
  name: 'Boba Fett, Daimyo',
  kind: 'leader',
  aspects: ['Command', 'Heroism'],
  traits: ['Underworld'],
  unique: true,
  printedCost: 6,
  faces: {
    leader: {
      triggers: [
        {
          id: 'observe',
          timing: 'friendly-played',
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
                    controller: 'friendly',
                  },
                  bind: 'chosen',
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'modify',
                        power: 1,
                        hp: 0,
                        duration: 'phase',
                      },
                    },
                  ],
                },
              ],
            },
          ],
          condition: {
            kind: 'unit-matches',
            target: 'subject',
            filter: {
              minKeywords: 1,
            },
          },
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
      auras: [
        {
          id: 'keyword-allies',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
            minKeywords: 1,
          },
          power: 1,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
