import type { BaseDefinition } from '../definition.ts';

export const administratorsTower = {
  cardId: 'administrator-s-tower',
  traits: [],
  name: "Administrator's Tower",
  kind: 'base',
  hp: 30,
  aspects: ['Cunning'],
} as const satisfies BaseDefinition;
