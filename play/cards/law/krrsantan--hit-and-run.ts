import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 ability costs fixture.
export const krrsantanHitAndRun = {
  cardId: 'krrsantan--hit-and-run',
  name: 'Krrsantan, Hit and Run',
  kind: 'unit',
  aspects: ['Aggression', 'Cunning'],
  traits: ['Underworld', 'Wookiee', 'Bounty Hunter'],
  unique: true,
  cost: 8,
  power: 7,
  hp: 7,
  arena: 'ground',
  keywords: ['Ambush', 'Overwhelm'],
  actions: [
    {
      id: 'retreat',
      costs: [
        {
          kind: 'discard-hand',
          count: 2,
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'return-to-hand',
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
