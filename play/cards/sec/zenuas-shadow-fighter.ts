import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const zenuasShadowFighter = {
  cardId: 'zenuas-shadow-fighter',
  name: 'Zenuas Shadow Fighter',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Separatist', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'space',
  keywords: ['Hidden'],
} as const satisfies UnitDefinition;
