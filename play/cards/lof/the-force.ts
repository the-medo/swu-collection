import type { PlayerTokenDefinition } from '../definition.ts';

// LOF 003. Printed text is pinned in meta-force-indirect fixture.
export const theForce = {
  cardId: 'the-force',
  name: 'The Force',
  kind: 'player-token',
  aspects: [],
  traits: [],
  token: true,
  tokenType: 'force',
  zone: 'base',
} as const satisfies PlayerTokenDefinition;
