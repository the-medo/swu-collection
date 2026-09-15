import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const attunedFyrnock = {
  cardId: 'attuned-fyrnock',
  name: 'Attuned Fyrnock',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Creature'],
  cost: 2,
  power: 4,
  hp: 1,
  arena: 'ground',
  keywords: ['Hidden'],
} as const satisfies UnitDefinition;
