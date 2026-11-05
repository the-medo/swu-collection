import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSatineKryzeCommittedToPeace = {
  cardId: 'satine-kryze--committed-to-peace',
  name: 'Satine Kryze, Committed to Peace',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Mandalorian', 'Official'],
  cost: 4,
  unique: true,
  power: 0,
  hp: 6,
  arena: 'ground',
  auras: [
    {
      id: 'aura',
      filter: {},
      abilities: {
        actions: [
          {
            id: 'action',
            costs: [
              {
                kind: 'exhaust-self',
              },
            ],
            limit: null,
            effects: [
              {
                kind: 'mill',
                player: 'enemy',
                count: {
                  kind: 'ceil-divide',
                  value: {
                    kind: 'unit-stat',
                    target: 'source',
                    stat: 'remaining-hp',
                  },
                  divisor: 2,
                },
                bind: 'milled',
                effects: [],
              },
            ],
          },
        ],
      },
    },
  ],
} as const satisfies UnitDefinition;
