import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const guildAmbushTeam = {
  cardId: 'guild-ambush-team',
  name: 'Guild Ambush Team',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Bounty Hunter'],
  cost: 5,
  power: 5,
  hp: 4,
  arena: 'ground',
  keywords: ['Ambush'],
} as const satisfies UnitDefinition;
