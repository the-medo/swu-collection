import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const theCrystalCity = {
  cardId: 'the-crystal-city',
  kind: 'base',
  name: 'The Crystal City',
  aspects: ['Vigilance'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
