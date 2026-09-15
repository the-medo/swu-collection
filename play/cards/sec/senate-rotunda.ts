import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const senateRotunda = {
  cardId: 'senate-rotunda',
  kind: 'base',
  name: 'Senate Rotunda',
  aspects: ['Command'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
