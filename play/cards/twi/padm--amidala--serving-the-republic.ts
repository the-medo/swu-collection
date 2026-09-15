import type { LeaderDefinition } from '../definition.ts';

// Printed faces and clarifications are pinned in leader-history.json.
export const padmAmidalaServingTheRepublic = {
  cardId: 'padm--amidala--serving-the-republic',
  name: 'Padm\u00e9 Amidala, Serving the Republic',
  kind: 'leader',
  aspects: ['Command', 'Heroism'],
  traits: ['Naboo', 'Republic', 'Official'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      keywords: ['Coordinate'],
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'search-deck',
              count: 3,
              filter: 'any',
              trait: 'Republic',
              max: 1,
            },
          ],
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
            },
            amount: 3,
          },
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
      keywords: ['Coordinate'],
      power: 2,
      hp: 7,
      arena: 'ground',
      restore: 1,
      triggers: [
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'search-deck',
              count: 3,
              filter: 'any',
              trait: 'Republic',
              max: 1,
            },
          ],
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
            },
            amount: 3,
          },
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
