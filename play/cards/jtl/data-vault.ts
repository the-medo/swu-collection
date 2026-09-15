import type { BaseDefinition } from '../definition.ts';

// JTL 024. Printed text is pinned in meta-play-costs fixture.
export const dataVault = {
  cardId: 'data-vault',
  name: 'Data Vault',
  kind: 'base',
  aspects: ['Command'],
  traits: [],
  hp: 33,
  minimumDeckIncrease: 10,
} as const satisfies BaseDefinition;
