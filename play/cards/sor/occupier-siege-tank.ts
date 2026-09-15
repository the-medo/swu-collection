import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const occupierSiegeTank = {
  cardId: 'occupier-siege-tank',
  name: 'Occupier Siege Tank',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Imperial', 'Vehicle', 'Tank'],
  cost: 5,
  power: 5,
  hp: 4,
  arena: 'ground',
  keywords: ['Grit'],
} as const satisfies UnitDefinition;
