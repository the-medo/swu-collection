import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const blueSquadronAssaultWing = {
  cardId: 'blue-squadron-assault-wing',
  name: 'Blue Squadron Assault Wing',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Republic', 'Vehicle', 'Fighter'],
  cost: 5,
  power: 5,
  hp: 5,
  arena: 'space',
  raid: 1,
} as const satisfies UnitDefinition;
