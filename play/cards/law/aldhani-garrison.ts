import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const aldhaniGarrison = {
  cardId: 'aldhani-garrison',
  kind: 'base',
  name: 'Aldhani Garrison',
  aspects: ['Command'],
  traits: [],
  hp: 27,
  actions: [
    {
      id: 'epic',
      costs: [],
      limit: 'once-per-game',
      effects: [
        {
          kind: 'play-card',
          from: 'hand',
          filter: {},
          optional: false,
          ignoreOneColoredPenalty: true,
        },
      ],
    },
  ],
} as const satisfies BaseDefinition;
