import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const mynock = {
  cardId: 'mynock',
  name: 'Mynock',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Creature'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'space',
  keywords: ['Overwhelm'],
} as const satisfies UnitDefinition;
