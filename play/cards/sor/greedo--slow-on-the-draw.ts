import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGreedoSlowOnTheDraw = {
  cardId: 'greedo--slow-on-the-draw',
  name: 'Greedo, Slow on the Draw',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 1,
  unique: true,
  power: 3,
  hp: 1,
  arena: 'ground',
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
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
                  notKind: 'unit',
                },
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
                      amount: 2,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      optional: true,
    },
  ],
} as const satisfies UnitDefinition;
