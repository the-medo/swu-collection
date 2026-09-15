import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 damage replacement fixture.
export const atAttinSafetyDroid = {
  cardId: 'at-attin-safety-droid',
  name: 'At Attin Safety Droid',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Republic', 'Droid'],
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
  baseDamageLimit: 4,
} as const satisfies UnitDefinition;
