import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const theNest = {
  cardId: 'the-nest',
  kind: 'base',
  name: 'The Nest',
  aspects: ['Aggression'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
