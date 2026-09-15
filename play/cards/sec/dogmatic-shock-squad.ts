import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const dogmaticShockSquad = {
  cardId: 'dogmatic-shock-squad',
  name: 'Dogmatic Shock Squad',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 6,
  power: 4,
  hp: 6,
  arena: 'ground',
  keywords: ['Sentinel', 'Plot'],
} as const satisfies UnitDefinition;
