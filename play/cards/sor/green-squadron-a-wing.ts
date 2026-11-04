import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetGreenSquadronAWing = {
  cardId: 'green-squadron-a-wing',
  name: 'Green Squadron A-Wing',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 1,
  hp: 3,
  arena: 'space',
  raid: 2,
} as const satisfies UnitDefinition;
