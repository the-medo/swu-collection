import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetSystemPatrolCraft = {
  cardId: 'system-patrol-craft',
  name: 'System Patrol Craft',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Vehicle', 'Fighter'],
  cost: 4,
  power: 3,
  hp: 4,
  arena: 'space',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
