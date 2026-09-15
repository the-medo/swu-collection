import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-payments.json.
export const theStarhawkPrototypeBattleship = {
  cardId: 'the-starhawk--prototype-battleship',
  name: 'The Starhawk, Prototype Battleship',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['New Republic', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 9,
  power: 6,
  hp: 9,
  arena: 'space',
  keywords: ['Ambush'],
  halveResourcePayments: true,
} as const satisfies UnitDefinition;
