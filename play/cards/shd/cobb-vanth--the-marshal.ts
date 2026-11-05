import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCobbVanthTheMarshal = {
  cardId: 'cobb-vanth--the-marshal',
  name: 'Cobb Vanth, The Marshal',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Fringe', 'Official'],
  cost: 3,
  unique: true,
  power: 3,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'search-deck',
          count: 10,
          max: 1,
          filter: 'unit',
          cardFilter: {
            maxCost: 2,
          },
          destination: 'discard',
          bind: 'selected',
          afterEach: [
            {
              kind: 'grant-discard-play',
              target: 'selected',
              player: 'self',
              free: true,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
