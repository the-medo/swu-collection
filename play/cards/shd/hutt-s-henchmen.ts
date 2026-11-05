import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetHuttSHenchmen = {
  cardId: 'hutt-s-henchmen',
  name: "Hutt's Henchmen",
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Underworld'],
  cost: 4,
  power: 3,
  hp: 4,
  arena: 'ground',
  keywords: ['Shielded'],
} as const satisfies UnitDefinition;
