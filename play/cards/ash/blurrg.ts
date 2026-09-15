import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const blurrg = {
  cardId: 'blurrg',
  name: 'Blurrg',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Creature'],
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  keywords: ['Support', 'Overwhelm'],
} as const satisfies UnitDefinition;
