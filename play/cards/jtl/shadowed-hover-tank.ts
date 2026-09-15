import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const shadowedHoverTank = {
  cardId: 'shadowed-hover-tank',
  name: 'Shadowed Hover Tank',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Fringe', 'Vehicle', 'Tank'],
  cost: 4,
  power: 5,
  hp: 3,
  arena: 'ground',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
