import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 hidden choices fixture.
export const profundityWeFight = {
  cardId: 'profundity--we-fight-',
  name: 'Profundity, We Fight!',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 9,
  power: 8,
  hp: 9,
  arena: 'space',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'discard-played',
      timing: 'played',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'self',
              effects: [
                {
                  kind: 'inspect-zone',
                  zone: 'hand',
                  player: 'self',
                  chooser: 'owner',
                  filter: {},
                  min: 1,
                  max: 1,
                  bind: 'discarded',
                  group: 'discarded-cards',
                  effects: [
                    {
                      kind: 'move-cards',
                      group: 'discarded-cards',
                      from: 'hand',
                      to: 'discard',
                      discardBy: 'owner',
                    },
                  ],
                  after: [],
                },
              ],
            },
            {
              id: 'enemy',
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
                  group: 'discarded-cards',
                  effects: [
                    {
                      kind: 'move-cards',
                      group: 'discarded-cards',
                      from: 'hand',
                      to: 'discard',
                      discardBy: 'owner',
                    },
                  ],
                  after: [
                    {
                      kind: 'if',
                      condition: {
                        kind: 'more-cards-than-opponent',
                        player: 'enemy',
                      },
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
                          group: 'discarded-cards',
                          effects: [
                            {
                              kind: 'move-cards',
                              group: 'discarded-cards',
                              from: 'hand',
                              to: 'discard',
                              discardBy: 'owner',
                            },
                          ],
                          after: [],
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
    {
      id: 'discard-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'self',
              effects: [
                {
                  kind: 'inspect-zone',
                  zone: 'hand',
                  player: 'self',
                  chooser: 'owner',
                  filter: {},
                  min: 1,
                  max: 1,
                  bind: 'discarded',
                  group: 'discarded-cards',
                  effects: [
                    {
                      kind: 'move-cards',
                      group: 'discarded-cards',
                      from: 'hand',
                      to: 'discard',
                      discardBy: 'owner',
                    },
                  ],
                  after: [],
                },
              ],
            },
            {
              id: 'enemy',
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
                  group: 'discarded-cards',
                  effects: [
                    {
                      kind: 'move-cards',
                      group: 'discarded-cards',
                      from: 'hand',
                      to: 'discard',
                      discardBy: 'owner',
                    },
                  ],
                  after: [
                    {
                      kind: 'if',
                      condition: {
                        kind: 'more-cards-than-opponent',
                        player: 'enemy',
                      },
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
                          group: 'discarded-cards',
                          effects: [
                            {
                              kind: 'move-cards',
                              group: 'discarded-cards',
                              from: 'hand',
                              to: 'discard',
                              discardBy: 'owner',
                            },
                          ],
                          after: [],
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
