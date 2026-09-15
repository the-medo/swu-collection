import type { BaseDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const stygeonSpire = {
  cardId: 'stygeon-spire',
  name: 'Stygeon Spire',
  kind: 'base',
  aspects: ['Aggression'],
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
