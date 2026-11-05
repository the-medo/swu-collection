import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetPhaseIiCloneTrooper = {
  cardId: 'phase-ii-clone-trooper',
  name: 'Phase II Clone Trooper',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 3,
  power: 3,
  hp: 2,
  arena: 'ground',
  keywords: ['Ambush'],
} as const satisfies UnitDefinition;
