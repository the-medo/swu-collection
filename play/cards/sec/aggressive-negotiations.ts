import type { EventDefinition } from '../definition.ts';

// SEC 179: fix the bonus at attack declaration, after this event leaves hand.
export const aggressiveNegotiations = {
  cardId: 'aggressive-negotiations',
  traits: ['Tactic'],
  name: 'Aggressive Negotiations',
  kind: 'event',
  aspects: ['Aggression'],
  cost: 3,
  effects: [{ kind: 'attack-with-unit', powerBonus: 'hand-size' }],
} as const satisfies EventDefinition;
