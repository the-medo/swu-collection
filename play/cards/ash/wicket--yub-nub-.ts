import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-advanced.json.
export const wicketYubNub = {
  cardId: 'wicket--yub-nub-',
  name: 'Wicket, Yub Nub!',
  kind: 'unit',
  aspects: ['Command', 'Aggression', 'Heroism'],
  traits: ['Ewok'],
  unique: true,
  cost: 1,
  power: 3,
  hp: 3,
  arena: 'ground',
  keywords: ['Saboteur'],
  cannotAttackBases: true,
} as const satisfies UnitDefinition;
