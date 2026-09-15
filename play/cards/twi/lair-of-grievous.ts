import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const lairOfGrievous = {
  cardId: 'lair-of-grievous',
  kind: 'base',
  name: 'Lair of Grievous',
  aspects: ['Command'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
