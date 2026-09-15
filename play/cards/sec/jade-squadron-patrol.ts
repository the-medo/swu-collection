import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const jadeSquadronPatrol = {
  cardId: 'jade-squadron-patrol',
  name: 'Jade Squadron Patrol',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Resistance', 'Vehicle', 'Fighter'],
  cost: 6,
  power: 6,
  hp: 6,
  arena: 'space',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
