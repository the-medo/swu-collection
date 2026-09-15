import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const loanShark = {
  cardId: 'loan-shark',
  name: 'Loan Shark',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Official'],
  cost: 4,
  power: 2,
  hp: 5,
  arena: 'ground',
  keywords: ['Ambush'],
  raid: 1,
} as const satisfies UnitDefinition;
