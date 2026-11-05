import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteEqualize = {
  cardId: 'equalize',
  name: 'Equalize',
  kind: 'event',
  aspects: ['Vigilance', 'Vigilance'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      filter: {},
      optional: false,
      bind: 'first',
      effects: [
        {
          kind: 'with-value',
          name: 'enemy-controller',
          value: {
            kind: 'conditional',
            condition: {
              kind: 'unit-matches',
              target: 'first',
              filter: {
                controller: 'enemy',
              },
            },
            then: 1,
            otherwise: 0,
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'first',
              operation: {
                kind: 'modify',
                power: -2,
                hp: -2,
                duration: 'phase',
              },
            },
            {
              kind: 'if',
              condition: {
                kind: 'all',
                conditions: [
                  {
                    kind: 'value-at-least',
                    name: 'enemy-controller',
                    amount: 1,
                  },
                  {
                    kind: 'unit-count-comparison',
                    relation: 'less',
                  },
                ],
              },
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    otherThan: 'first',
                  },
                  optional: false,
                  bind: 'chosen',
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'modify',
                        power: -2,
                        hp: -2,
                        duration: 'phase',
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
} as const satisfies EventDefinition;
