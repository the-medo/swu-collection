import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const emperorSChampion = {
  cardId: 'emperor-s-champion',
  name: "Emperor's Champion",
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Imperial'],
  cost: 4,
  power: 3,
  hp: 5,
  arena: 'ground',
  keywords: ['Shielded', 'Saboteur'],
} as const satisfies UnitDefinition;
