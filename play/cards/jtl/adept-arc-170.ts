import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const adeptArc170 = {
  cardId: 'adept-arc-170',
  name: 'Adept ARC-170',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Republic', 'Vehicle', 'Fighter'],
  cost: 4,
  power: 3,
  hp: 4,
  arena: 'space',
  restore: 2,
} as const satisfies UnitDefinition;
