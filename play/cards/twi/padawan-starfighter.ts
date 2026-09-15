import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const padawanStarfighter = {
  cardId: 'padawan-starfighter',
  name: 'Padawan Starfighter',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Jedi', 'Republic', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 1,
  hp: 3,
  arena: 'space',
  constant: [
    {
      condition: {
        kind: 'cards-in-play-at-least',
        filter: {
          controller: 'friendly',
          trait: 'Force',
          roles: ['unit', 'upgrade'],
        },
        amount: 1,
      },
      power: 1,
      hp: 1,
    },
  ],
} as const satisfies UnitDefinition;
