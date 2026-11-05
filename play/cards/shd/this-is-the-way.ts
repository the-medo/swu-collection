import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteThisIsTheWay = {
  cardId: 'this-is-the-way',
  name: 'This Is The Way',
  kind: 'event',
  aspects: ['Heroism'],
  traits: ['Mandalorian'],
  cost: 2,
  effects: [
    {
      kind: 'search-deck',
      count: 8,
      max: 2,
      filter: 'any',
      cardFilter: {
        anyOf: [
          {
            kind: 'upgrade',
          },
          {
            trait: 'Mandalorian',
          },
        ],
      },
    },
  ],
} as const satisfies EventDefinition;
