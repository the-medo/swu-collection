import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const gr75MediumTransport = {
  cardId: 'gr-75-medium-transport',
  name: 'GR-75 Medium Transport',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Transport'],
  cost: 5,
  power: 5,
  hp: 4,
  arena: 'space',
} as const satisfies UnitDefinition;
