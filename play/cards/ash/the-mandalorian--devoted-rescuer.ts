import type { UnitDefinition } from '../definition.ts';

// Printed text and rulings are pinned in the meta-prevention fixture.
export const theMandalorianDevotedRescuer = {
  cardId: 'the-mandalorian--devoted-rescuer',
  name: 'The Mandalorian, Devoted Rescuer',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Mandalorian'],
  cost: 4,
  power: 5,
  hp: 4,
  arena: 'ground',
  unique: true,
  keywords: ['Shielded'],
  preventFriendlyByShield: true,
} as const satisfies UnitDefinition;
