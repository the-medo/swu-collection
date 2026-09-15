import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-choices.json.
export const hiredSlicer = {
  cardId: 'hired-slicer',
  name: 'Hired Slicer',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Fringe'],
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'self',
              effects: [
                {
                  kind: 'reveal-deck-cards',
                  player: 'self',
                  count: 2,
                  group: 'revealed',
                  effects: [
                    {
                      kind: 'if',
                      condition: {
                        kind: 'value-at-least',
                        name: 'revealed-count',
                        amount: 2,
                      },
                      effects: [
                        {
                          kind: 'select-unit',
                          filter: {
                            sharesTraitWithGroup: 'revealed',
                          },
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
                    {
                      kind: 'bottom-deck-group',
                      group: 'revealed',
                    },
                  ],
                },
              ],
            },
            {
              id: 'enemy',
              effects: [
                {
                  kind: 'reveal-deck-cards',
                  player: 'enemy',
                  count: 2,
                  group: 'revealed',
                  effects: [
                    {
                      kind: 'if',
                      condition: {
                        kind: 'value-at-least',
                        name: 'revealed-count',
                        amount: 2,
                      },
                      effects: [
                        {
                          kind: 'select-unit',
                          filter: {
                            sharesTraitWithGroup: 'revealed',
                          },
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
                    {
                      kind: 'bottom-deck-group',
                      group: 'revealed',
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
