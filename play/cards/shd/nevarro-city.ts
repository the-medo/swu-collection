import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const nevarroCity = {
  cardId: 'nevarro-city',
  kind: 'base',
  name: 'Nevarro City',
  aspects: ['Command'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
