import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSquadronOfVultures = {
  cardId: 'squadron-of-vultures',
  name: 'Squadron of Vultures',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Separatist', 'Droid', 'Vehicle', 'Fighter'],
  cost: 6,
  power: 5,
  hp: 4,
  arena: 'space',
  exploit: 3,
} as const satisfies UnitDefinition;
