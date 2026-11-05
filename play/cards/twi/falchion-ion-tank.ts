import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetFalchionIonTank = {
  cardId: 'falchion-ion-tank',
  name: 'Falchion Ion Tank',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Republic', 'Vehicle', 'Tank'],
  cost: 6,
  power: 4,
  hp: 6,
  arena: 'ground',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
