import type { BaseDefinition } from '../definition.ts';

// Printed text and rulings are pinned in the meta-aspect-abilities fixture.
export const cantoBight = {
  cardId: 'canto-bight',
  name: 'Canto Bight',
  kind: 'base',
  aspects: ['Cunning'],
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
