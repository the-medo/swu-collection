import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const pykePalace = {
  cardId: 'pyke-palace',
  kind: 'base',
  name: 'Pyke Palace',
  aspects: ['Cunning'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
