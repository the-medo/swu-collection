import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const notiMobilePod = {
  cardId: 'noti-mobile-pod',
  name: 'Noti Mobile Pod',
  kind: 'unit',
  aspects: [],
  traits: ['Vehicle', 'Transport'],
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
} as const satisfies UnitDefinition;
