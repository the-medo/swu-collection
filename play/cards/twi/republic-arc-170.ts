import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetRepublicArc170 = {
  cardId: 'republic-arc-170',
  name: 'Republic ARC-170',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Republic', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'space',
} as const satisfies UnitDefinition;
