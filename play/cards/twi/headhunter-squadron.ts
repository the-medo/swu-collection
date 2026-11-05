import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetHeadhunterSquadron = {
  cardId: 'headhunter-squadron',
  name: 'Headhunter Squadron',
  kind: 'unit',
  aspects: [],
  traits: ['Republic', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'space',
} as const satisfies UnitDefinition;
