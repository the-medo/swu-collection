import type { UnitDefinition } from '../definition.ts';

// LAW 118. Printed text is pinned in the meta foundation fixture.
export const droidLaserTurret = {
  cardId: 'droid-laser-turret',
  name: 'Droid Laser Turret',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Droid'],
  cost: 3,
  power: 2,
  hp: 1,
  arena: 'ground',
  keywords: ['Sentinel', 'Shielded'],
} as const satisfies UnitDefinition;
