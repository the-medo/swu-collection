import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const kestroCity = {
  cardId: 'kestro-city',
  kind: 'base',
  name: 'Kestro City',
  aspects: ['Aggression'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
