import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const raxianAssembly = {
  cardId: 'raxian-assembly',
  name: 'Raxian Assembly',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Separatist', 'Official'],
  cost: 5,
  power: 6,
  hp: 5,
  arena: 'ground',
} as const satisfies UnitDefinition;
