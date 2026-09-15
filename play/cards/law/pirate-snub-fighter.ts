import type { UnitDefinition } from '../definition.ts';

// LAW 135. Printed text is pinned in the meta foundation fixture.
export const pirateSnubFighter = {
  cardId: 'pirate-snub-fighter',
  name: 'Pirate Snub Fighter',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'space',
  keywords: ['Ambush'],
} as const satisfies UnitDefinition;
