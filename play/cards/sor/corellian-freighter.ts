import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const corellianFreighter = {
  cardId: 'corellian-freighter',
  name: 'Corellian Freighter',
  kind: 'unit',
  aspects: [],
  traits: ['Vehicle', 'Transport'],
  cost: 5,
  power: 4,
  hp: 4,
  arena: 'space',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
