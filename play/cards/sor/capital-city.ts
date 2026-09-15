import type { BaseDefinition } from '../definition.ts';

export const capitalCity = {
  cardId: 'capital-city',
  traits: [],
  name: 'Capital City',
  kind: 'base',
  hp: 30,
  aspects: ['Vigilance'],
} as const satisfies BaseDefinition;
