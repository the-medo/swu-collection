import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const echoCaverns = {
  cardId: 'echo-caverns',
  kind: 'base',
  name: 'Echo Caverns',
  aspects: ['Cunning'],
  traits: [],
  hp: 20,
} as const satisfies BaseDefinition;
