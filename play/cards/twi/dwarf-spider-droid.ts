import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetDwarfSpiderDroid = {
  cardId: 'dwarf-spider-droid',
  name: 'Dwarf Spider Droid',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Separatist', 'Droid'],
  cost: 4,
  power: 3,
  hp: 4,
  arena: 'ground',
  keywords: ['Grit'],
} as const satisfies UnitDefinition;
