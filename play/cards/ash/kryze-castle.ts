import type { BaseDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const kryzeCastle = {
  cardId: 'kryze-castle',
  name: 'Kryze Castle',
  kind: 'base',
  aspects: ['Command'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
