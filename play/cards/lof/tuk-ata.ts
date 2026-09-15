import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const tukAta = {
  cardId: 'tuk-ata',
  name: "Tuk'ata",
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Creature'],
  cost: 3,
  power: 4,
  hp: 2,
  arena: 'ground',
  keywords: ['Hidden'],
} as const satisfies UnitDefinition;
