import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const carsonTevaThereSSomethingGoingOn = {
  cardId: 'carson-teva--there-s-something-going-on',
  name: "Carson Teva, There's Something Going On",
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['New Republic'],
  unique: true,
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
  keywords: ['Support'],
  firstCombatDamage: true,
} as const satisfies UnitDefinition;
