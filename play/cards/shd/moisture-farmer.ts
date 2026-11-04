import type { UnitDefinition } from '../definition.ts';

// Reprinted in IC27 047; identity and text follow the official catalog.
export const ic27ReprintMoistureFarmer = {
  cardId: 'moisture-farmer',
  name: 'Moisture Farmer',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Fringe'],
  cost: 1,
  power: 0,
  hp: 4,
  arena: 'ground',
  restore: 2,
} as const satisfies UnitDefinition;
