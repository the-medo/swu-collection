import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const petranakiArena = {
  cardId: 'petranaki-arena',
  kind: 'base',
  name: 'Petranaki Arena',
  aspects: ['Cunning'],
  traits: [],
  hp: 26,
  auras: [
    {
      id: 'leader-stat',
      filter: {
        controller: 'friendly',
        leader: true,
      },
      power: 1,
    },
  ],
} as const satisfies BaseDefinition;
