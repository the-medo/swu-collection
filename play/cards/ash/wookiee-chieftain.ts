import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const wookieeChieftain = {
  cardId: 'wookiee-chieftain',
  name: 'Wookiee Chieftain',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Wookiee'],
  cost: 5,
  power: 4,
  hp: 6,
  arena: 'ground',
  keywords: ['Grit'],
} as const satisfies UnitDefinition;
