import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const coruscantUndercityPolice = {
  cardId: 'coruscant-undercity-police',
  name: 'Coruscant Undercity Police',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Republic', 'Trooper'],
  cost: 4,
  power: 5,
  hp: 4,
  arena: 'ground',
} as const satisfies UnitDefinition;
