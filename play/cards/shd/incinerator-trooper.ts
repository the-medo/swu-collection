import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteIncineratorTrooper = {
  cardId: 'incinerator-trooper',
  name: 'Incinerator Trooper',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Imperial', 'Trooper'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'ground',
  firstCombatDamage: true,
} as const satisfies UnitDefinition;
