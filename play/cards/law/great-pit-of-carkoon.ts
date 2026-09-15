import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-allocations.json.
export const greatPitOfCarkoon = {
  cardId: 'great-pit-of-carkoon',
  name: 'Great Pit of Carkoon',
  kind: 'base',
  aspects: ['Command'],
  traits: [],
  hp: 27,
  actions: [
    {
      id: 'epic',
      costs: [
        {
          kind: 'discard-hand',
          count: 1,
          filter: {
            kind: 'unit',
          },
        },
      ],
      limit: 'once-per-game',
      effects: [
        {
          kind: 'search-deck',
          count: {
            kind: 'zone-size',
            zone: 'deck',
            player: 'self',
          },
          filter: 'any',
          name: 'The Sarlacc of Carkoon',
          max: 1,
        },
      ],
    },
  ],
} as const satisfies BaseDefinition;
