import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySet332NdStalwart = {
  cardId: '332nd-stalwart',
  name: '332nd Stalwart',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 1,
  power: 1,
  hp: 2,
  arena: 'ground',
  keywords: ['Coordinate'],
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
        },
        amount: 3,
      },
      power: 1,
      hp: 1,
    },
  ],
} as const satisfies UnitDefinition;
