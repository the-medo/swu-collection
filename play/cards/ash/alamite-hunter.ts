import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const alamiteHunter = {
  cardId: 'alamite-hunter',
  name: 'Alamite Hunter',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Fringe'],
  cost: 1,
  power: 1,
  hp: 4,
  arena: 'ground',
  keywords: ['Overwhelm'],
} as const satisfies UnitDefinition;
