import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const technoUnionTransport = {
  cardId: 'techno-union-transport',
  name: 'Techno Union Transport',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Separatist', 'Vehicle', 'Transport'],
  cost: 5,
  power: 4,
  hp: 6,
  arena: 'space',
  keywords: ['Shielded'],
} as const satisfies UnitDefinition;
