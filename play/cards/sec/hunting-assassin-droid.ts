import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const huntingAssassinDroid = {
  cardId: 'hunting-assassin-droid',
  name: 'Hunting Assassin Droid',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Underworld', 'Droid', 'Bounty Hunter'],
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'enemy',
          damaged: true,
        },
        amount: 1,
      },
      abilities: {
        raid: 2,
      },
    },
  ],
} as const satisfies UnitDefinition;
