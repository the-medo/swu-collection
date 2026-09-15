import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const shuttleTydiriumFlyCasual = {
  cardId: 'shuttle-tydirium--fly-casual',
  name: 'Shuttle Tydirium, Fly Casual',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Transport'],
  unique: true,
  cost: 3,
  power: 2,
  hp: 4,
  arena: 'space',
  triggers: [
    {
      id: 'odd-supply',
      timing: 'attack',
      effects: [
        {
          kind: 'mill',
          player: 'self',
          count: 1,
          bind: 'milled',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'card-matches',
                target: 'milled',
                filter: {
                  costParity: 'odd',
                },
              },
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    otherThan: 'source',
                  },
                  bind: 'chosen',
                  optional: true,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'give-token',
                        token: 'experience',
                        count: 1,
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
} as const satisfies UnitDefinition;
