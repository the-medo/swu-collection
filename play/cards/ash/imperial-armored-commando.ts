import type { UnitDefinition } from '../definition.ts';

export const imperialArmoredCommando = {
  cardId: 'imperial-armored-commando',
  traits: ['Imperial', 'Trooper'],
  name: 'Imperial Armored Commando',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  cost: 4,
  power: 4,
  hp: 3,
  arena: 'ground',
  keywords: ['Sentinel', 'Shielded'],
} as const satisfies UnitDefinition;
