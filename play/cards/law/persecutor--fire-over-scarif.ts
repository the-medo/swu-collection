import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const persecutorFireOverScarif = {
  cardId: 'persecutor--fire-over-scarif',
  name: 'Persecutor, Fire Over Scarif',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 9,
  power: 9,
  hp: 7,
  arena: 'space',
  triggers: [
    {
      id: 'bombard-played',
      timing: 'played',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'ground',
              effects: [
                {
                  kind: 'choose-mode',
                  options: [
                    {
                      id: 'damage',
                      effects: [
                        {
                          kind: 'damage-units',
                          amount: 3,
                          filter: {
                            arena: 'ground',
                          },
                          mandatory: true,
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
            {
              id: 'space',
              effects: [
                {
                  kind: 'choose-mode',
                  options: [
                    {
                      id: 'damage',
                      effects: [
                        {
                          kind: 'damage-units',
                          amount: 3,
                          filter: {
                            arena: 'space',
                          },
                          mandatory: true,
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
        },
      ],
    },
    {
      id: 'bombard-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'ground',
              effects: [
                {
                  kind: 'choose-mode',
                  options: [
                    {
                      id: 'damage',
                      effects: [
                        {
                          kind: 'damage-units',
                          amount: 3,
                          filter: {
                            arena: 'ground',
                          },
                          mandatory: true,
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
            {
              id: 'space',
              effects: [
                {
                  kind: 'choose-mode',
                  options: [
                    {
                      id: 'damage',
                      effects: [
                        {
                          kind: 'damage-units',
                          amount: 3,
                          filter: {
                            arena: 'space',
                          },
                          mandatory: true,
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
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
