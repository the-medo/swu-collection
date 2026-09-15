import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const contrabandStarhopper = {
  cardId: 'contraband-starhopper',
  name: 'Contraband Starhopper',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'space',
} as const satisfies UnitDefinition;
