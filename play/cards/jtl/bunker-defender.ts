import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const bunkerDefender = {
  cardId: 'bunker-defender',
  name: 'Bunker Defender',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Imperial', 'Trooper'],
  cost: 1,
  power: 2,
  hp: 1,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          trait: 'Vehicle',
        },
        amount: 1,
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
} as const satisfies UnitDefinition;
