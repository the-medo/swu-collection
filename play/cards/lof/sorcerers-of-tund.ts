import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const sorcerersOfTund = {
  cardId: 'sorcerers-of-tund',
  name: 'Sorcerers of Tund',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Force', 'Fringe'],
  cost: 6,
  power: 6,
  hp: 6,
  arena: 'ground',
  keywords: ['Shielded'],
} as const satisfies UnitDefinition;
