import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const hiveDefenseWing = {
  cardId: 'hive-defense-wing',
  name: 'Hive Defense Wing',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Separatist', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 2,
  hp: 4,
  arena: 'space',
  restore: 1,
} as const satisfies UnitDefinition;
