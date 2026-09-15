import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const scoutingTieFighter = {
  cardId: 'scouting-tie-fighter',
  name: 'Scouting TIE Fighter',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Imperial', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'space',
} as const satisfies UnitDefinition;
