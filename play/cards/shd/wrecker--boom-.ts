import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteWreckerBoom = {
  cardId: 'wrecker--boom-',
  name: 'Wrecker, BOOM!',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Fringe', 'Clone'],
  cost: 6,
  unique: true,
  power: 7,
  hp: 6,
  arena: 'ground',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-resources',
          player: 'self',
          exhausted: 'any',
          min: 0,
          max: 1,
          operation: 'defeat',
          countAs: 'defeated',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'value-at-least',
                name: 'defeated',
                amount: 1,
              },
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    arena: 'ground',
                  },
                  optional: false,
                  bind: 'chosen',
                  effects: [
                    {
                      kind: 'damage-target',
                      target: 'chosen',
                      amount: 5,
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
