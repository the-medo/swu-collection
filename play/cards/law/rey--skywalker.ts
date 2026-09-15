import type { UnitDefinition } from '../definition.ts';

// Printed text and rulings are pinned in the meta-prevention fixture.
export const reySkywalker = {
  cardId: 'rey--skywalker',
  name: 'Rey, Skywalker',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Force', 'Jedi', 'Resistance'],
  cost: 8,
  power: 9,
  hp: 9,
  arena: 'ground',
  unique: true,
  enemyAbilityImmunity: ['defeat'],
  cannotChangeController: true,
} as const satisfies UnitDefinition;
