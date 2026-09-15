import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const gunganWarrior = {
  cardId: 'gungan-warrior',
  name: 'Gungan Warrior',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Gungan', 'Trooper'],
  cost: 3,
  power: 3,
  hp: 2,
  arena: 'ground',
  keywords: ['Shielded'],
  restore: 1,
} as const satisfies UnitDefinition;
