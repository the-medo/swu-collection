import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const tipocaCity = {
  cardId: 'tipoca-city',
  kind: 'base',
  name: 'Tipoca City',
  aspects: ['Command'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
