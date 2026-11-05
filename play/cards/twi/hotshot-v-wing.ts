import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetHotshotVWing = {
  cardId: 'hotshot-v-wing',
  name: 'Hotshot V-Wing',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Republic', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'space',
} as const satisfies UnitDefinition;
