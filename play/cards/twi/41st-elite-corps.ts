import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySet41StEliteCorps = {
  cardId: '41st-elite-corps',
  name: '41st Elite Corps',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 3,
  power: 3,
  hp: 3,
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
      power: 0,
      hp: 3,
    },
  ],
} as const satisfies UnitDefinition;
