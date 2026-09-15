import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const liberatedWookiee = {
  cardId: 'liberated-wookiee',
  name: 'Liberated Wookiee',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Wookiee'],
  cost: 2,
  power: 2,
  hp: 4,
  arena: 'ground',
} as const satisfies UnitDefinition;
