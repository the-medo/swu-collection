import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const brightHopeNarrowEscape = {
  cardId: 'bright-hope--narrow-escape',
  name: 'Bright Hope, Narrow Escape',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Transport'],
  unique: true,
  cost: 6,
  power: 4,
  hp: 6,
  arena: 'space',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
