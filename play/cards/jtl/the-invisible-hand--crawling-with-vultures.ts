import type { UnitDefinition } from '../definition.ts';

// Catalog text is pinned in meta-post-search; updated end-of-attack timing is documented.
export const theInvisibleHandCrawlingWithVultures = {
  cardId: 'the-invisible-hand--crawling-with-vultures',
  name: 'The Invisible Hand, Crawling With Vultures',
  aspects: ['Command', 'Villainy'],
  traits: ['Separatist', 'Vehicle', 'Capital Ship'],
  cost: 6,
  kind: 'unit',
  power: 6,
  hp: 6,
  arena: 'space',
  unique: true,
  triggers: [
    {
      id: 'find-droid',
      timing: 'played',
      effects: [
        {
          kind: 'search-deck',
          count: 8,
          filter: 'unit',
          trait: 'Droid',
          max: 1,
          bind: 'droid',
          after: [
            {
              kind: 'play-card',
              from: 'hand',
              target: 'droid',
              filter: {
                kind: 'unit',
                trait: 'Droid',
                maxCost: 2,
              },
              optional: true,
              free: true,
            },
          ],
        },
      ],
    },
    {
      id: 'end-find-droid',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'value-at-least',
            name: 'survived',
            amount: 1,
          },
          effects: [
            {
              kind: 'search-deck',
              count: 8,
              filter: 'unit',
              trait: 'Droid',
              max: 1,
              bind: 'droid',
              after: [
                {
                  kind: 'play-card',
                  from: 'hand',
                  target: 'droid',
                  filter: {
                    kind: 'unit',
                    trait: 'Droid',
                    maxCost: 2,
                  },
                  optional: true,
                  free: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
