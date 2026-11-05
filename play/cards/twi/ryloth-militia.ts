import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetRylothMilitia = {
  cardId: 'ryloth-militia',
  name: 'Ryloth Militia',
  kind: 'unit',
  aspects: ['Command'],
  traits: ["Twi'lek", 'Trooper'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  raid: 1,
} as const satisfies UnitDefinition;
