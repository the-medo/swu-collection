import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const evacuationEscort = {
  cardId: 'evacuation-escort',
  name: 'Evacuation Escort',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Rebel', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'space',
} as const satisfies UnitDefinition;
