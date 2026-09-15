import type { BaseDefinition } from '../definition.ts';

// ASH 20. Printed text is pinned in the meta foundation fixture.
export const nevarroCityRestored = {
  cardId: 'nevarro-city--restored',
  name: 'Nevarro City, Restored',
  kind: 'base',
  aspects: ['Vigilance'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
