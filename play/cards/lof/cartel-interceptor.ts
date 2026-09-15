import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const cartelInterceptor = {
  cardId: 'cartel-interceptor',
  name: 'Cartel Interceptor',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 2,
  hp: 3,
  arena: 'space',
  raid: 2,
} as const satisfies UnitDefinition;
