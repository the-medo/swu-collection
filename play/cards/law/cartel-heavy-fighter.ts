import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const cartelHeavyFighter = {
  cardId: 'cartel-heavy-fighter',
  name: 'Cartel Heavy Fighter',
  kind: 'unit',
  aspects: [],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 3,
  hp: 2,
  arena: 'space',
  keywords: ['Overwhelm'],
} as const satisfies UnitDefinition;
