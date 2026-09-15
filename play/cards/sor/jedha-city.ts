import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const jedhaCity = {
  cardId: 'jedha-city',
  kind: 'base',
  name: 'Jedha City',
  aspects: ['Cunning'],
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
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: -4,
                hp: 0,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies BaseDefinition;
