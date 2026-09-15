import type { EventDefinition } from '../definition.ts';

// SOR 219, pinned catalog text: the reduction is three resources.
export const sneakAttack = {
  cardId: 'sneak-attack',
  traits: ['Trick'],
  name: 'Sneak Attack',
  kind: 'event',
  aspects: ['Cunning'],
  cost: 2,
  effects: [{ kind: 'play-unit', discount: 3, ready: true, defeatAtRegroup: true }],
} as const satisfies EventDefinition;
