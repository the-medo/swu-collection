import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const shieldedHauler = {
  cardId: 'shielded-hauler',
  name: 'Shielded Hauler',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  cost: 5,
  power: 4,
  hp: 5,
  arena: 'space',
  keywords: ['Shielded'],
} as const satisfies UnitDefinition;
