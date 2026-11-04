import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetSoldierOfThe501St = {
  cardId: 'soldier-of-the-501st',
  name: 'Soldier of the 501st',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 1,
  power: 1,
  hp: 3,
  arena: 'ground',
  raid: 1,
} as const satisfies UnitDefinition;
