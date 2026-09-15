import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const pauCity = {
  cardId: 'pau-city',
  kind: 'base',
  name: 'Pau City',
  aspects: ['Vigilance'],
  traits: [],
  hp: 26,
  auras: [
    {
      id: 'leader-stat',
      filter: {
        controller: 'friendly',
        leader: true,
      },
      hp: 1,
    },
  ],
} as const satisfies BaseDefinition;
