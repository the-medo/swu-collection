import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const daroCommando = {
  cardId: 'daro-commando',
  name: 'Daro Commando',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Imperial', 'Clone', 'Trooper'],
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  keywords: ['Overwhelm'],
} as const satisfies UnitDefinition;
