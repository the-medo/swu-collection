import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetMercenaryCompany = {
  cardId: 'mercenary-company',
  name: 'Mercenary Company',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Underworld', 'Trooper'],
  cost: 6,
  power: 5,
  hp: 5,
  arena: 'ground',
  keywords: ['Ambush', 'Overwhelm'],
} as const satisfies UnitDefinition;
