import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetLiberatedSlaves = {
  cardId: 'liberated-slaves',
  name: 'Liberated Slaves',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Fringe', 'Droid', "Twi'lek", 'Wookiee'],
  cost: 3,
  power: 3,
  hp: 5,
  arena: 'ground',
} as const satisfies UnitDefinition;
