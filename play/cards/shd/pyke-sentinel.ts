import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetPykeSentinel = {
  cardId: 'pyke-sentinel',
  name: 'Pyke Sentinel',
  kind: 'unit',
  aspects: ['Villainy', 'Vigilance'],
  traits: ['Underworld'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
