import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const remnantTrooperCorps = {
  cardId: 'remnant-trooper-corps',
  name: 'Remnant Trooper Corps',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Imperial', 'Trooper'],
  cost: 5,
  power: 6,
  hp: 5,
  arena: 'ground',
  keywords: ['Hidden'],
} as const satisfies UnitDefinition;
