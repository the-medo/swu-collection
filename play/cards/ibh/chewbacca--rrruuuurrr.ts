import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const chewbaccaRrruuuurrr = {
  cardId: 'chewbacca--rrruuuurrr',
  name: 'Chewbacca, Rrruuuurrr',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Rebel', 'Wookiee'],
  unique: true,
  cost: 5,
  power: 3,
  hp: 6,
  arena: 'ground',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
