import type { BaseDefinition } from '../definition.ts';

// JTL 20. Printed text is pinned in the meta foundation fixture.
export const shieldGeneratorComplex = {
  cardId: 'shield-generator-complex',
  name: 'Shield Generator Complex',
  kind: 'base',
  aspects: ['Vigilance'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
