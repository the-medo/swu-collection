import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteKiAdiMundiComposedAndConfident = {
  cardId: 'ki-adi-mundi--composed-and-confident',
  name: 'Ki-Adi-Mundi, Composed and Confident',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Force', 'Jedi', 'Republic'],
  cost: 5,
  unique: true,
  power: 5,
  hp: 7,
  arena: 'ground',
  keywords: ['Coordinate'],
  triggers: [
    {
      id: 'enemy-card-played',
      timing: 'enemy-card-played',
      effects: [
        {
          kind: 'draw-cards',
          amount: 2,
        },
      ],
      optional: true,
      condition: {
        kind: 'all',
        conditions: [
          {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
            },
            amount: 3,
          },
          {
            kind: 'cards-played-this-phase-at-least',
            player: 'enemy',
            amount: 2,
          },
          {
            kind: 'not',
            condition: {
              kind: 'cards-played-this-phase-at-least',
              player: 'enemy',
              amount: 3,
            },
          },
        ],
      },
    },
  ],
} as const satisfies UnitDefinition;
