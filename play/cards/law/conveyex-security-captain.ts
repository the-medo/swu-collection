import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 phase history and tokens fixture.
export const conveyexSecurityCaptain = {
  cardId: 'conveyex-security-captain',
  name: 'Conveyex Security Captain',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Imperial', 'Trooper'],
  cost: 3,
  power: 2,
  hp: 4,
  arena: 'ground',
  blankEnemyCredits: true,
} as const satisfies UnitDefinition;
