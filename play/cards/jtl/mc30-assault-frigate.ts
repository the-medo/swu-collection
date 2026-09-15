import type { UnitDefinition } from '../definition.ts';

// JTL . V8 rules; printed text pinned in meta combat fixture.
export const mc30AssaultFrigate = {
  cardId: 'mc30-assault-frigate',
  name: 'MC30 Assault Frigate',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Rebel', 'Vehicle', 'Capital Ship'],
  cost: 5,
  power: 5,
  hp: 5,
  arena: 'space',
  keywords: ['Overwhelm'],
  raid: 1,
} as const satisfies UnitDefinition;
