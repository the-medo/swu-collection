import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const lambdaShuttle = {
  cardId: 'lambda-shuttle',
  name: 'Lambda Shuttle',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Imperial', 'Vehicle', 'Transport'],
  cost: 4,
  power: 2,
  hp: 5,
  arena: 'space',
  restore: 1,
} as const satisfies UnitDefinition;
