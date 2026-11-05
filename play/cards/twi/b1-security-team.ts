import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetB1SecurityTeam = {
  cardId: 'b1-security-team',
  name: 'B1 Security Team',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Separatist', 'Droid', 'Trooper'],
  cost: 2,
  power: 3,
  hp: 1,
  arena: 'ground',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
