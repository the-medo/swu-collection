import type { UnitDefinition } from '../definition.ts';

// ASH 117. Printed text is pinned in the meta foundation fixture.
export const outlandProtector = {
  cardId: 'outland-protector',
  name: 'Outland Protector',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Imperial', 'Vehicle', 'Fighter'],
  cost: 1,
  power: 1,
  hp: 2,
  arena: 'space',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
