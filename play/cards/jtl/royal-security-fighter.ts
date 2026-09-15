import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const royalSecurityFighter = {
  cardId: 'royal-security-fighter',
  name: 'Royal Security Fighter',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Naboo', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'space',
  keywords: ['Grit'],
} as const satisfies UnitDefinition;
