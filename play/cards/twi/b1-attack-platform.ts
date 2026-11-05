import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetB1AttackPlatform = {
  cardId: 'b1-attack-platform',
  name: 'B1 Attack Platform',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Separatist', 'Droid', 'Trooper'],
  cost: 3,
  power: 5,
  hp: 2,
  arena: 'ground',
} as const satisfies UnitDefinition;
