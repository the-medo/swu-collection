import type { BaseDefinition } from '../definition.ts';

// ASH 21. Printed text is pinned in the meta foundation fixture.
export const emperorSThroneRoom = {
  cardId: 'emperor-s-throne-room',
  name: "Emperor's Throne Room",
  kind: 'base',
  aspects: ['Command'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
