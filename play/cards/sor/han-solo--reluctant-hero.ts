import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteHanSoloReluctantHero = {
  cardId: 'han-solo--reluctant-hero',
  name: 'Han Solo, Reluctant Hero',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Underworld'],
  cost: 7,
  unique: true,
  power: 6,
  hp: 6,
  arena: 'ground',
  keywords: ['Ambush'],
  firstCombatDamage: true,
} as const satisfies UnitDefinition;
