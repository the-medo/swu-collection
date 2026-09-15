import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 attack mechanics fixture.
export const theStrangerNoSurvivors = {
  cardId: 'the-stranger--no-survivors',
  name: 'The Stranger, No Survivors',
  kind: 'unit',
  aspects: ['Vigilance', 'Cunning', 'Villainy'],
  traits: ['Force', 'Sith'],
  unique: true,
  cost: 5,
  power: 1,
  hp: 7,
  arena: 'ground',
  keywords: ['Ambush', 'Grit'],
  defenderCombatFirst: true,
} as const satisfies UnitDefinition;
