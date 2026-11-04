import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetWarriorDrone = {
  cardId: 'warrior-drone',
  name: 'Warrior Drone',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Separatist'],
  cost: 1,
  power: 1,
  hp: 4,
  arena: 'ground',
} as const satisfies UnitDefinition;
