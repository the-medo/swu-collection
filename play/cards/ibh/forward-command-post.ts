import type { BaseDefinition } from '../definition.ts';

// IBH 54. Printed text is pinned in the meta foundation fixture.
export const forwardCommandPost = {
  cardId: 'forward-command-post',
  name: 'Forward Command Post',
  kind: 'base',
  aspects: ['Vigilance'],
  traits: [],
  hp: 20,
} as const satisfies BaseDefinition;
