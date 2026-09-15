import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const tridentAssaultShip = {
  cardId: 'trident-assault-ship',
  name: 'Trident Assault Ship',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Separatist', 'Vehicle', 'Transport'],
  cost: 6,
  power: 6,
  hp: 6,
  arena: 'space',
  keywords: ['Overwhelm'],
} as const satisfies UnitDefinition;
