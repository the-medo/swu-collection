import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const cruelCommandos = {
  cardId: 'cruel-commandos',
  name: 'Cruel Commandos',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 5,
  power: 5,
  hp: 5,
  arena: 'ground',
  keywords: ['Sentinel', 'Overwhelm'],
} as const satisfies UnitDefinition;
