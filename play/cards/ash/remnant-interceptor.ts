import type { UnitDefinition } from '../definition.ts';

export const remnantInterceptor = {
  cardId: 'remnant-interceptor',
  name: 'Remnant Interceptor',
  kind: 'unit',
  traits: ['Imperial', 'Vehicle', 'Fighter'],
  aspects: ['Command', 'Villainy'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'space',
  keywords: ['Support'],
  restore: 1,
} as const satisfies UnitDefinition;
