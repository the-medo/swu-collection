import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const indoctrinatedConscript = {
  cardId: 'indoctrinated-conscript',
  name: 'Indoctrinated Conscript',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['First Order', 'Pilot'],
  cost: 1,
  power: 1,
  hp: 2,
  arena: 'ground',
  piloting: [
    {
      id: 'piloting',
      cost: 1,
      aspects: ['Villainy'],
    },
  ],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: {
      power: 1,
      hp: 2,
    },
  },
} as const satisfies UnitDefinition;
