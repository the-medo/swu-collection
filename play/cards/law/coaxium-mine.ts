import type { BaseDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const coaxiumMine = {
  cardId: 'coaxium-mine',
  name: 'Coaxium Mine',
  kind: 'base',
  aspects: ['Vigilance'],
  traits: [],
  hp: 27,
  actions: [
    {
      id: 'discounted-play',
      costs: [],
      limit: 'once-per-game',
      effects: [
        {
          kind: 'play-card',
          from: 'hand',
          filter: {},
          ignoreOneColoredPenalty: true,
          optional: false,
        },
      ],
    },
  ],
} as const satisfies BaseDefinition;
