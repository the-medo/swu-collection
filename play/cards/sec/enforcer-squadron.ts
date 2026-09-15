import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const enforcerSquadron = {
  cardId: 'enforcer-squadron',
  name: 'Enforcer Squadron',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Republic', 'Vehicle', 'Fighter'],
  cost: 4,
  power: 5,
  hp: 3,
  arena: 'space',
  keywords: ['Hidden'],
} as const satisfies UnitDefinition;
