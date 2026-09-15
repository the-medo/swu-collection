import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-attributes.json.
export const oppoRancisisAncientCouncilor = {
  cardId: 'oppo-rancisis--ancient-councilor',
  name: 'Oppo Rancisis, Ancient Councilor',
  kind: 'unit',
  aspects: ['Command', 'Command'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 5,
  arena: 'ground',
  keywordSharing: {
    keywords: ['Ambush', 'Grit', 'Hidden', 'Overwhelm', 'Saboteur', 'Sentinel', 'Shielded'],
    raid: 2,
    restore: 2,
  },
} as const satisfies UnitDefinition;
