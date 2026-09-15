import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const retrofittedAirspeeder = {
  cardId: 'retrofitted-airspeeder',
  name: 'Retrofitted Airspeeder',
  kind: 'unit',
  aspects: [],
  traits: ['Vehicle', 'Speeder'],
  cost: 5,
  power: 3,
  hp: 6,
  arena: 'ground',
  keywords: ['Ambush'],
  attackBothArenas: true,
  constant: [
    {
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          attackingAgainst: {
            arena: 'space',
          },
        },
      },
      power: -1,
    },
  ],
} as const satisfies UnitDefinition;
