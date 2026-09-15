import type { BaseDefinition } from '../definition.ts';

// ASH 24. Printed text is pinned in the meta foundation fixture.
export const dragonsnakeBog = {
  cardId: 'dragonsnake-bog',
  name: 'Dragonsnake Bog',
  kind: 'base',
  aspects: ['Aggression'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
