import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const imperialLoyalist = {
  cardId: 'imperial-loyalist',
  name: 'Imperial Loyalist',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Imperial'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'ground',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
