import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const supremeCouncilAide = {
  cardId: 'supreme-council-aide',
  name: 'Supreme Council Aide',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['First Order', 'Official'],
  cost: 1,
  power: 2,
  hp: 2,
  arena: 'ground',
} as const satisfies UnitDefinition;
