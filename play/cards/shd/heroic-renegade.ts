import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetHeroicRenegade = {
  cardId: 'heroic-renegade',
  name: 'Heroic Renegade',
  kind: 'unit',
  aspects: ['Heroism', 'Aggression'],
  traits: ['Underworld'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  keywords: ['Grit'],
} as const satisfies UnitDefinition;
