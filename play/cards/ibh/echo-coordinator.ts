import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const echoCoordinator = {
  cardId: 'echo-coordinator',
  name: 'Echo Coordinator',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel'],
  cost: 2,
  power: 1,
  hp: 5,
  arena: 'ground',
} as const satisfies UnitDefinition;
