import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const theedPalace = {
  cardId: 'theed-palace',
  kind: 'base',
  name: 'Theed Palace',
  aspects: ['Command'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
