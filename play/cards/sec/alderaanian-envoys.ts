import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const alderaanianEnvoys = {
  cardId: 'alderaanian-envoys',
  name: 'Alderaanian Envoys',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Republic', 'Official'],
  cost: 6,
  power: 3,
  hp: 7,
  arena: 'ground',
  restore: 3,
} as const satisfies UnitDefinition;
