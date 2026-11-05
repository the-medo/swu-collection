import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetSeventhFleetDefender = {
  cardId: 'seventh-fleet-defender',
  name: 'Seventh Fleet Defender',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 3,
  hp: 2,
  arena: 'space',
  keywords: ['Shielded'],
} as const satisfies UnitDefinition;
