import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetEchoValiantArcTrooper = {
  cardId: 'echo--valiant-arc-trooper',
  name: 'Echo, Valiant ARC Trooper',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 2,
  unique: true,
  power: 2,
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
      power: 2,
      hp: 2,
    },
  ],
} as const satisfies UnitDefinition;
