import type { LeaderDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 conditional ability fixture.
export const avarKrissMarshalOfStarlight = {
  cardId: 'avar-kriss--marshal-of-starlight',
  name: 'Avar Kriss, Marshal of Starlight',
  kind: 'leader',
  aspects: ['Command', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  printedCost: 9,
  faces: {
    leader: {
      actions: [
        {
          id: 'gain-force',
          costs: [
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'gain-force',
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
                amount: 9,
                reducedBy: {
                  kind: 'force-uses-this-phase',
                },
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 10,
      arena: 'ground',
      constant: [
        {
          condition: {
            kind: 'force-with-you',
          },
          power: 4,
          abilities: {
            keywords: ['Overwhelm'],
          },
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
