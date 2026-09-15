import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-choices.json.
export const mysticMonastery = {
  cardId: 'mystic-monastery',
  name: 'Mystic Monastery',
  kind: 'base',
  aspects: ['Command'],
  traits: [],
  hp: 25,
  actions: [
    {
      id: 'gain-force',
      costs: [],
      limit: {
        per: 'game',
        max: 3,
      },
      effects: [
        {
          kind: 'gain-force',
        },
      ],
    },
  ],
} as const satisfies BaseDefinition;
