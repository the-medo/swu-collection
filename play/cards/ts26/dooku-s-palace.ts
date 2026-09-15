import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-allocations.json.
export const dookuSPalace = {
  cardId: 'dooku-s-palace',
  name: "Dooku's Palace",
  kind: 'base',
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
          filter: {
            kind: 'unit',
          },
          discount: {
            kind: 'unit-count',
            filter: {
              controller: 'friendly',
              leader: true,
            },
          },
          optional: false,
        },
      ],
    },
  ],
} as const satisfies BaseDefinition;
