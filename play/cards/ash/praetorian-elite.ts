import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const praetorianElite = {
  cardId: 'praetorian-elite',
  name: 'Praetorian Elite',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Imperial'],
  cost: 4,
  power: 5,
  hp: 4,
  arena: 'ground',
  keywords: ['Grit'],
} as const satisfies UnitDefinition;
