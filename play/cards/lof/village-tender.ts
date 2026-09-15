import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const villageTender = {
  cardId: 'village-tender',
  name: 'Village Tender',
  kind: 'unit',
  aspects: ['Command'],
  traits: [],
  cost: 1,
  power: 1,
  hp: 3,
  arena: 'ground',
  keywords: ['Hidden'],
  restore: 1,
} as const satisfies UnitDefinition;
