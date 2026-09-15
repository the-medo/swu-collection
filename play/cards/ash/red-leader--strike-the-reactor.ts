import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-advanced.json.
export const redLeaderStrikeTheReactor = {
  cardId: 'red-leader--strike-the-reactor',
  name: 'Red Leader, Strike the Reactor',
  kind: 'unit',
  aspects: ['Command', 'Cunning', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Fighter'],
  unique: true,
  cost: 7,
  power: 6,
  hp: 6,
  arena: 'space',
  keywords: ['Support'],
  attackBothArenas: true,
} as const satisfies UnitDefinition;
