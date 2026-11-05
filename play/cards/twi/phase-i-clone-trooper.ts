import type { UnitDefinition } from '../definition.ts';

// Reprinted in IC27 189; identity and text follow the official catalog.
export const ic27ReprintPhaseICloneTrooper = {
  cardId: 'phase-i-clone-trooper',
  name: 'Phase I Clone Trooper',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 2,
  power: 3,
  hp: 2,
  arena: 'ground',
} as const satisfies UnitDefinition;
