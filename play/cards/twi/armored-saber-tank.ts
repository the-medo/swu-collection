import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetArmoredSaberTank = {
  cardId: 'armored-saber-tank',
  name: 'Armored Saber Tank',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Republic', 'Vehicle', 'Tank'],
  cost: 6,
  power: 5,
  hp: 5,
  arena: 'ground',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
