import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePloKoonKohToYah = {
  cardId: 'plo-koon--koh-to-yah-',
  name: 'Plo Koon, Koh-to-yah!',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  cost: 5,
  unique: true,
  power: 3,
  hp: 6,
  arena: 'ground',
  keywords: ['Ambush', 'Coordinate'],
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
        },
        amount: 3,
      },
      raid: 3,
    },
  ],
} as const satisfies UnitDefinition;
