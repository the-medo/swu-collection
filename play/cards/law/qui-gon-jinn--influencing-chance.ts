import type { UnitDefinition } from '../definition.ts';
export const quiGonJinnInfluencingChance = {
  cardId: 'qui-gon-jinn--influencing-chance',
  name: 'Qui-Gon Jinn, Influencing Chance',
  kind: 'unit',
  unique: true,
  cost: 4,
  power: 3,
  hp: 5,
  arena: 'ground',
  aspects: ['Cunning'],
  traits: ['Force', 'Jedi', 'Republic'],
  keywords: ['Sentinel'],
  triggers: (['played', 'attack'] as const).map(timing => ({
    id: `${timing}-look`,
    timing,
    effects: [{ kind: 'look-deck', count: 3, mode: 'discard-one' }],
  })),
} as const satisfies UnitDefinition;
