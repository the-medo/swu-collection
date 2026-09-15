import type { UnitDefinition } from '../definition.ts';

// ASH 201. Printed text is pinned in the meta foundation fixture.
export const openCircleAce = {
  cardId: 'open-circle-ace',
  name: 'Open Circle Ace',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Republic', 'Vehicle', 'Fighter'],
  cost: 1,
  power: 2,
  hp: 2,
  arena: 'space',
} as const satisfies UnitDefinition;
