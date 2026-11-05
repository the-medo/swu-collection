import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetWroshyrTreeTender = {
  cardId: 'wroshyr-tree-tender',
  name: 'Wroshyr Tree Tender',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Wookiee'],
  cost: 3,
  power: 2,
  hp: 4,
  arena: 'ground',
  keywords: ['Grit'],
} as const satisfies UnitDefinition;
