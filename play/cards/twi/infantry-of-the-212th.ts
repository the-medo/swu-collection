import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteInfantryOfThe212Th = {
  cardId: 'infantry-of-the-212th',
  name: 'Infantry of the 212th',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 3,
  power: 2,
  hp: 4,
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
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
} as const satisfies UnitDefinition;
