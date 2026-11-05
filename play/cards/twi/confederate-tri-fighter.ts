import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteConfederateTriFighter = {
  cardId: 'confederate-tri-fighter',
  name: 'Confederate Tri-Fighter',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Separatist', 'Droid', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'space',
  preventBaseHealing: true,
} as const satisfies UnitDefinition;
