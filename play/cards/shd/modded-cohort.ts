import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetModdedCohort = {
  cardId: 'modded-cohort',
  name: 'Modded Cohort',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Underworld'],
  cost: 4,
  power: 2,
  hp: 4,
  arena: 'ground',
  keywords: ['Ambush'],
  raid: 2,
} as const satisfies UnitDefinition;
