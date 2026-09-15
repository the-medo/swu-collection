import type { UnitDefinition } from '../definition.ts';

// ASH 248. Neel uses the official printed-power erratum pinned with the catalog rules.
export const neelTheCutestBoy = {
  cardId: 'neel--the-cutest-boy',
  name: 'Neel, The Cutest Boy',
  unique: true,
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Fringe'],
  cost: 1,
  power: 1,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'next-play',
          filter: {
            kind: 'unit',
            maxPower: 1,
          },
          ready: true,
        },
      ],
    },
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'next-play',
          filter: {
            kind: 'unit',
            maxPower: 1,
          },
          ready: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
