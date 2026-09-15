import type { LeaderDefinition } from '../definition.ts';

// Official face text is pinned in leader-plot-discount.json.
export const chancellorPalpatineHowLibertyDies = {
  cardId: 'chancellor-palpatine--how-liberty-dies',
  name: 'Chancellor Palpatine, How Liberty Dies',
  kind: 'leader',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Republic', 'Official'],
  unique: true,
  printedCost: 7,
  faces: {
    leader: {
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
              count: 5,
              filter: 'any',
              hasKeyword: 'Plot',
              max: 1,
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
              condition: {
                kind: 'resources-at-least',
                amount: 7,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 6,
      hp: 8,
      arena: 'ground',
      triggers: [
        {
          id: 'deployed',
          timing: 'deployed',
          effects: [
            {
              kind: 'next-play',
              filter: {},
              using: 'plot',
              discount: 3,
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
