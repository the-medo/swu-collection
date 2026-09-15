import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const jabbaSPalace = {
  cardId: 'jabba-s-palace',
  kind: 'base',
  name: "Jabba's Palace",
  aspects: ['Cunning'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
