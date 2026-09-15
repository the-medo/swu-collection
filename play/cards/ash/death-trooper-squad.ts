import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const deathTrooperSquad = {
  cardId: 'death-trooper-squad',
  name: 'Death Trooper Squad',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Imperial', 'Trooper'],
  cost: 4,
  power: 5,
  hp: 4,
  arena: 'ground',
} as const satisfies UnitDefinition;
