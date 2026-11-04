import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetSyndicateLackeys = {
  cardId: 'syndicate-lackeys',
  name: 'Syndicate Lackeys',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld'],
  cost: 5,
  power: 5,
  hp: 4,
  arena: 'ground',
  keywords: ['Ambush'],
} as const satisfies UnitDefinition;
