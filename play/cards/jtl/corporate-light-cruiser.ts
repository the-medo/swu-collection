import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const corporateLightCruiser = {
  cardId: 'corporate-light-cruiser',
  name: 'Corporate Light Cruiser',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Fringe', 'Vehicle', 'Capital Ship'],
  cost: 6,
  power: 4,
  hp: 6,
  arena: 'space',
  keywords: ['Ambush'],
  raid: 1,
} as const satisfies UnitDefinition;
