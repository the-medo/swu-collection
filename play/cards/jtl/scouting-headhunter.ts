import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const scoutingHeadhunter = {
  cardId: 'scouting-headhunter',
  name: 'Scouting Headhunter',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Fringe', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 1,
  arena: 'space',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
