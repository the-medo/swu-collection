import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const imperialCommandComplex = {
  cardId: 'imperial-command-complex',
  kind: 'base',
  name: 'Imperial Command Complex',
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
