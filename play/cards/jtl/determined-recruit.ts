import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const determinedRecruit = {
  cardId: 'determined-recruit',
  name: 'Determined Recruit',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Resistance', 'Pilot'],
  cost: 2,
  power: 3,
  hp: 1,
  arena: 'ground',
  piloting: [
    {
      id: 'piloting',
      cost: 2,
      aspects: ['Aggression'],
    },
  ],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: {
      power: 3,
      hp: 1,
    },
  },
} as const satisfies UnitDefinition;
