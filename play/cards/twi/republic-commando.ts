import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRepublicCommando = {
  cardId: 'republic-commando',
  name: 'Republic Commando',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 3,
  power: 2,
  hp: 5,
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
        keywords: ['Saboteur'],
      },
    },
  ],
} as const satisfies UnitDefinition;
