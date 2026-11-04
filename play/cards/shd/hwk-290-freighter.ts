import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetHwk290Freighter = {
  cardId: 'hwk-290-freighter',
  name: 'HWK-290 Freighter',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Vehicle', 'Transport'],
  cost: 3,
  power: 2,
  hp: 5,
  arena: 'space',
} as const satisfies UnitDefinition;
