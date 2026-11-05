import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteDroidekaSecurity = {
  cardId: 'droideka-security',
  name: 'Droideka Security',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Separatist', 'Droid'],
  cost: 6,
  power: 4,
  hp: 5,
  arena: 'ground',
  exploit: 2,
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
