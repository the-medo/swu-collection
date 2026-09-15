import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const covertVeteran = {
  cardId: 'covert-veteran',
  name: 'Covert Veteran',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Mandalorian'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  keywords: ['Hidden'],
} as const satisfies UnitDefinition;
