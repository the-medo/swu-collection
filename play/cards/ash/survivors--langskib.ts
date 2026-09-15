import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const survivorsLangskib = {
  cardId: 'survivors--langskib',
  name: "Survivors' Langskib",
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Mandalorian', 'Vehicle', 'Speeder'],
  cost: 4,
  power: 4,
  hp: 4,
  arena: 'ground',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
