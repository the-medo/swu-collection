import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const recklessRebel = {
  cardId: 'reckless-rebel',
  name: 'Reckless Rebel',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Rebel', "Twi'lek"],
  cost: 1,
  power: 2,
  hp: 1,
  arena: 'ground',
  keywords: ['Saboteur'],
} as const satisfies UnitDefinition;
