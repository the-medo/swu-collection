import type { EventDefinition } from '../definition.ts';

export const surpriseStrike = {
  cardId: 'surprise-strike',
  traits: ['Tactic'],
  name: 'Surprise Strike',
  kind: 'event',
  aspects: ['Cunning'],
  cost: 2,
  effects: [{ kind: 'attack-with-unit', powerBonus: 3 }],
} as const satisfies EventDefinition;
