import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const tarkintown = {
  cardId: 'tarkintown',
  kind: 'base',
  name: 'Tarkintown',
  aspects: ['Aggression'],
  traits: [],
  hp: 25,
  actions: [
    {
      id: 'epic',
      costs: [],
      limit: 'once-per-game',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            nonLeader: true,
            damaged: true,
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 3,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies BaseDefinition;
