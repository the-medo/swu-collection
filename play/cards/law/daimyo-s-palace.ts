import type { BaseDefinition } from '../definition.ts';

// Printed text and rulings are pinned in the meta-aspect-abilities fixture.
export const daimyoSPalace = {
  cardId: 'daimyo-s-palace',
  name: "Daimyo's Palace",
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
