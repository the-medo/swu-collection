import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetAuzituckLiberatorGunship = {
  cardId: 'auzituck-liberator-gunship',
  name: 'Auzituck Liberator Gunship',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Vehicle', 'Fighter'],
  cost: 4,
  power: 3,
  hp: 4,
  arena: 'space',
  keywords: ['Ambush'],
} as const satisfies UnitDefinition;
