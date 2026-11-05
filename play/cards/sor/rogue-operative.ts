import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRogueOperative = {
  cardId: 'rogue-operative',
  name: 'Rogue Operative',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Rebel', 'Trooper'],
  cost: 3,
  power: 2,
  hp: 4,
  arena: 'ground',
  keywords: ['Saboteur'],
  raid: 2,
} as const satisfies UnitDefinition;
