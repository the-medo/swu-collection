import type { UnitDefinition } from '../definition.ts';

// Reprinted in IC27 192; identity and text follow the official catalog.
export const ic27ReprintEta2LightInterceptor = {
  cardId: 'eta-2-light-interceptor',
  name: 'Eta-2 Light Interceptor',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Republic', 'Vehicle', 'Fighter'],
  cost: 5,
  power: 3,
  hp: 4,
  arena: 'space',
  restore: 2,
} as const satisfies UnitDefinition;
