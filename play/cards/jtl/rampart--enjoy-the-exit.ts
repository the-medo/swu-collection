import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-interactions.json.
export const rampartEnjoyTheExit = {
  cardId: 'rampart--enjoy-the-exit',
  name: 'Rampart, Enjoy the Exit',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  unique: true,
  cost: 2,
  power: 3,
  hp: 3,
  arena: 'space',
  regroupReadyPower: 4,
} as const satisfies UnitDefinition;
