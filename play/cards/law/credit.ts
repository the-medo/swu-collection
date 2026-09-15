import type { PlayerTokenDefinition } from '../definition.ts';

// Printed text is pinned in the meta-credits fixture.
export const credit = {
  cardId: 'credit',
  name: 'Credit',
  aspects: [],
  traits: ['Supply'],
  kind: 'player-token',
  token: true,
  tokenType: 'credit',
  zone: 'resources',
  creditPayment: true,
} as const satisfies PlayerTokenDefinition;
