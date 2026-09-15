import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const sonTuulBerserkers = {
  cardId: 'son-tuul-berserkers',
  name: 'Son-tuul Berserkers',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Underworld', 'Trooper'],
  cost: 6,
  power: 8,
  hp: 5,
  arena: 'ground',
  keywords: ['Overwhelm'],
} as const satisfies UnitDefinition;
