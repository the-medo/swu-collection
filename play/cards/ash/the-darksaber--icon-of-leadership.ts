import type { UpgradeDefinition } from '../definition.ts';

// Printed text and rulings are pinned in the meta-attachments fixture.
export const theDarksaberIconOfLeadership = {
  cardId: 'the-darksaber--icon-of-leadership',
  name: 'The Darksaber, Icon of Leadership',
  kind: 'upgrade',
  token: false,
  aspects: ['Command'],
  traits: ['Mandalorian', 'Item', 'Weapon'],
  cost: 4,
  unique: true,
  modifiers: {
    power: 4,
    hp: 2,
  },
  attachTo: 'non-vehicle',
  attachFilter: {
    unique: true,
  },
  hostIsLeader: true,
  hostTraits: ['Mandalorian'],
  grants: {
    providesAspects: true,
  },
} as const satisfies UpgradeDefinition;
