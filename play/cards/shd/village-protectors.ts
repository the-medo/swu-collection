import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetVillageProtectors = {
  cardId: 'village-protectors',
  name: 'Village Protectors',
  kind: 'unit',
  aspects: ['Heroism', 'Vigilance'],
  traits: ['Fringe'],
  cost: 3,
  power: 2,
  hp: 2,
  arena: 'ground',
  keywords: ['Sentinel', 'Shielded'],
} as const satisfies UnitDefinition;
