import type { EventDefinition } from '../definition.ts';

export const openFire = {
  cardId: 'open-fire',
  traits: ['Tactic'],
  name: 'Open Fire',
  kind: 'event',
  aspects: ['Aggression'],
  cost: 3,
  effects: [{ kind: 'damage-unit', amount: 4, arena: 'any', optional: false }],
} as const satisfies EventDefinition;
