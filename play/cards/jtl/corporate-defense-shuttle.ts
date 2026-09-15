import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const corporateDefenseShuttle = {
  cardId: 'corporate-defense-shuttle',
  name: 'Corporate Defense Shuttle',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Separatist', 'Vehicle', 'Transport'],
  cost: 2,
  power: 3,
  hp: 5,
  arena: 'space',
  cannotAttack: true,
} as const satisfies UnitDefinition;
