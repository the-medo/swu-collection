import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const ricketyQuadjumper = {
  cardId: 'rickety-quadjumper',
  name: 'Rickety Quadjumper',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Fringe', 'Vehicle', 'Transport'],
  cost: 2,
  power: 1,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'reveal-top',
              effects: [
                {
                  kind: 'reveal-top',
                  player: 'self',
                  bind: 'top',
                  effects: [
                    {
                      kind: 'if',
                      condition: {
                        kind: 'card-matches',
                        target: 'top',
                        filter: { notKind: 'unit' },
                      },
                      effects: [
                        {
                          kind: 'select-unit',
                          filter: {
                            otherThan: 'source',
                          },
                          bind: 'chosen',
                          optional: false,
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
            {
              id: 'decline',
              effects: [],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
