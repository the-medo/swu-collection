import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetRegionalSympathizers = {
  cardId: 'regional-sympathizers',
  name: 'Regional Sympathizers',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Rebel'],
  cost: 4,
  power: 3,
  hp: 4,
  arena: 'ground',
  restore: 2,
} as const satisfies UnitDefinition;
