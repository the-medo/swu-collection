import type { UnitDefinition } from '../definition.ts';

// SEC . V8 rules; printed text pinned in meta combat fixture.
export const bravoSquadronFighter = {
  cardId: 'bravo-squadron-fighter',
  name: 'Bravo Squadron Fighter',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Naboo', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'space',
  keywords: ['Saboteur'],
} as const satisfies UnitDefinition;
