import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const shadowCollectiveCamp = {
  cardId: 'shadow-collective-camp',
  kind: 'base',
  name: 'Shadow Collective Camp',
  aspects: ['Aggression'],
  traits: [],
  hp: 25,
  triggers: [
    {
      id: 'leader-deployment',
      timing: 'leader-deployed',
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies BaseDefinition;
