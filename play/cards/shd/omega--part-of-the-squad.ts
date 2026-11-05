import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteOmegaPartOfTheSquad = {
  cardId: 'omega--part-of-the-squad',
  name: 'Omega, Part of the Squad',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Fringe', 'Clone'],
  cost: 2,
  unique: true,
  power: 2,
  hp: 2,
  arena: 'ground',
  ignoreAspectPenalties: [
    {
      filter: {
        kind: 'unit',
        trait: 'Clone',
      },
      firstEachRound: true,
    },
  ],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'search-deck',
          count: 5,
          max: 1,
          filter: 'any',
          cardFilter: {
            trait: 'Clone',
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
