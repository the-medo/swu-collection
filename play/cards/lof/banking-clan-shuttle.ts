import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const bankingClanShuttle = {
  cardId: 'banking-clan-shuttle',
  name: 'Banking Clan Shuttle',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Separatist', 'Vehicle', 'Transport'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'space',
  keywords: ['Hidden'],
} as const satisfies UnitDefinition;
