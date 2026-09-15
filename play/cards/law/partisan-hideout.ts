import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const partisanHideout = {
  cardId: 'partisan-hideout',
  kind: 'base',
  name: 'Partisan Hideout',
  aspects: ['Cunning'],
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
