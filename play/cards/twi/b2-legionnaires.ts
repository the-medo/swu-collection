import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteB2Legionnaires = {
  cardId: 'b2-legionnaires',
  name: 'B2 Legionnaires',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Separatist', 'Droid', 'Trooper'],
  cost: 5,
  power: 5,
  hp: 4,
  arena: 'ground',
  keywords: ['Sentinel', 'Overwhelm'],
} as const satisfies UnitDefinition;
