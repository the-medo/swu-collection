import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const rogueSquadronSpeeder = {
  cardId: 'rogue-squadron-speeder',
  name: 'Rogue Squadron Speeder',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Speeder'],
  cost: 4,
  power: 3,
  hp: 5,
  arena: 'ground',
  raid: 1,
} as const satisfies UnitDefinition;
