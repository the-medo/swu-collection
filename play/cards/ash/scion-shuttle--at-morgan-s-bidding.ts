import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const scionShuttleAtMorganSBidding = {
  cardId: 'scion-shuttle--at-morgan-s-bidding',
  name: "Scion Shuttle, At Morgan's Bidding",
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Transport'],
  unique: true,
  cost: 2,
  power: 1,
  hp: 3,
  arena: 'space',
  keywords: ['Support'],
  auras: [
    {
      id: 'weaken-defender',
      filter: {
        defendingAgainst: {
          sameAs: 'source',
        },
      },
      power: -1,
      hp: -1,
    },
  ],
} as const satisfies UnitDefinition;
