import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const zamWesellInconspicuousAssassin = {
  cardId: 'zam-wesell--inconspicuous-assassin',
  name: 'Zam Wesell, Inconspicuous Assassin',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter'],
  unique: true,
  cost: 2,
  power: 1,
  hp: 5,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          upgraded: true,
        },
      },
      abilities: {
        keywords: ['Grit'],
      },
    },
  ],
} as const satisfies UnitDefinition;
