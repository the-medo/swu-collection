import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const strikeTeamVanguard = {
  cardId: 'strike-team-vanguard',
  name: 'Strike Team Vanguard',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Rebel', 'Trooper'],
  cost: 4,
  power: 5,
  hp: 5,
  arena: 'ground',
} as const satisfies UnitDefinition;
