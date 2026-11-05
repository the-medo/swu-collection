import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGorGrievousSPet = {
  cardId: 'gor--grievous-s-pet',
  name: "Gor, Grievous's Pet",
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Separatist', 'Creature'],
  cost: 12,
  unique: true,
  power: 7,
  hp: 7,
  arena: 'ground',
  exploit: 3,
  keywords: ['Sentinel', 'Ambush', 'Overwhelm'],
} as const satisfies UnitDefinition;
