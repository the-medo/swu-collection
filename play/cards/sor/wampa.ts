import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const wampa = {
  cardId: 'wampa',
  name: 'Wampa',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Creature'],
  cost: 4,
  power: 4,
  hp: 5,
  arena: 'ground',
  keywords: ['Overwhelm'],
} as const satisfies UnitDefinition;
