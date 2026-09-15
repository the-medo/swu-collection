import type { BaseDefinition } from '../definition.ts';

export const catacombsOfCadera = {
  cardId: 'catacombs-of-cadera',
  traits: [],
  name: 'Catacombs of Cadera',
  kind: 'base',
  hp: 30,
  aspects: ['Aggression'],
} as const satisfies BaseDefinition;
