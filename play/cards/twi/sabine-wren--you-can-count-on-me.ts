import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSabineWrenYouCanCountOnMe = {
  cardId: 'sabine-wren--you-can-count-on-me',
  name: 'Sabine Wren, You Can Count On Me',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Fringe', 'Mandalorian', 'Spectre'],
  cost: 4,
  unique: true,
  power: 4,
  hp: 4,
  arena: 'ground',
  protectFromAttackUnlessSentinel: [
    {
      sameAs: 'source',
      exhausted: true,
    },
  ],
  triggers: [
    {
      id: 'attack',
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
                kind: 'not',
                condition: {
                  kind: 'card-matches',
                  target: 'milled',
                  filter: {
                    sharesAspectWith: 'own-base',
                  },
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
