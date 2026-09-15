import type { UnitDefinition } from '../definition.ts';

// SEC 28. Printed text is pinned in the meta foundation fixture.
export const trayusAcolyte = {
  cardId: 'trayus-acolyte',
  name: 'Trayus Acolyte',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Force', 'Sith'],
  cost: 2,
  power: 2,
  hp: 4,
  arena: 'ground',
} as const satisfies UnitDefinition;
