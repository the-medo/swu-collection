import type { LeaderDefinition } from '../definition.ts';

// Printed text and rulings are pinned in the meta-aspect-abilities fixture.
export const grandAdmiralSloaneHoldingTheEmpireTogether = {
  cardId: 'grand-admiral-sloane--holding-the-empire-together',
  name: 'Grand Admiral Sloane, Holding the Empire Together',
  kind: 'leader',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Official'],
  printedCost: 5,
  faces: {
    leader: {
      actions: [
        {
          id: 'arena-keywords',
          costs: [
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'ground',
                  effects: [
                    {
                      kind: 'modify-units',
                      filter: {
                        arena: 'ground',
                      },
                      operation: {
                        kind: 'modify',
                        power: 0,
                        hp: 0,
                        duration: 'phase',
                        abilities: {
                          keywords: ['Sentinel', 'Overwhelm'],
                        },
                      },
                    },
                  ],
                },
                {
                  id: 'space',
                  effects: [
                    {
                      kind: 'modify-units',
                      filter: {
                        arena: 'space',
                      },
                      operation: {
                        kind: 'modify',
                        power: 0,
                        hp: 0,
                        duration: 'phase',
                        abilities: {
                          keywords: ['Sentinel', 'Overwhelm'],
                        },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              as: 'unit',
              condition: {
                kind: 'resources-at-least',
                amount: 5,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 5,
      arena: 'ground',
      keywords: ['Overwhelm'],
      auras: [
        {
          id: 'friendly-keywords',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          abilities: {
            keywords: ['Sentinel', 'Overwhelm'],
          },
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
