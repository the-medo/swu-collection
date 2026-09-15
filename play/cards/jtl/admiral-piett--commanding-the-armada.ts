import type { LeaderDefinition } from '../definition.ts';

// JTL 005. Printed text is pinned in meta-play-costs fixture.
export const admiralPiettCommandingTheArmada = {
  cardId: 'admiral-piett--commanding-the-armada',
  name: 'Admiral Piett, Commanding the Armada',
  unique: true,
  kind: 'leader',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Official'],
  printedCost: 5,
  faces: {
    leader: {
      actions: [
        {
          id: 'command-capital-ship',
          costs: [
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'play-card',
              from: 'hand',
              filter: {
                kind: 'unit',
                trait: 'Capital Ship',
              },
              optional: false,
              discount: 1,
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
      power: 2,
      hp: 7,
      arena: 'ground',
      playReductions: [
        {
          id: 'capital-ship',
          filter: {
            kind: 'unit',
            trait: 'Capital Ship',
          },
          amount: 2,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
