import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const ahsokaTanoChasingWhispers = {
  cardId: 'ahsoka-tano--chasing-whispers',
  name: 'Ahsoka Tano, Chasing Whispers',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Fringe', 'Force'],
  unique: true,
  cost: 4,
  power: 3,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'opponent-discard',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'enemy',
          chooser: 'owner',
          filter: {},
          min: 1,
          max: 1,
          bind: 'discarded',
          effects: [
            {
              kind: 'move-card',
              target: 'discarded',
              from: 'hand',
              to: 'discard',
              discardBy: 'owner',
              effects: [
                {
                  kind: 'if',
                  condition: {
                    kind: 'card-matches',
                    target: 'discarded',
                    filter: {
                      kind: 'unit',
                    },
                  },
                  effects: [
                    {
                      kind: 'select-unit',
                      filter: {},
                      bind: 'chosen',
                      optional: true,
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'exhaust',
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
    },
  ],
} as const satisfies UnitDefinition;
