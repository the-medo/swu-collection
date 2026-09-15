import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const spiceMines = {
  cardId: 'spice-mines',
  kind: 'base',
  name: 'Spice Mines',
  aspects: ['Aggression'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
