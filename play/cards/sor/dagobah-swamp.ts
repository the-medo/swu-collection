import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const dagobahSwamp = {
  cardId: 'dagobah-swamp',
  kind: 'base',
  name: 'Dagobah Swamp',
  aspects: ['Vigilance'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
