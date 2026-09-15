import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-payments.json.
export const vuutunPalaaDroidControlShip = {
  cardId: 'vuutun-palaa--droid-control-ship',
  name: 'Vuutun Palaa, Droid Control Ship',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Separatist', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 9,
  power: 7,
  hp: 7,
  arena: 'space',
  costReductions: [
    {
      condition: {
        kind: 'always',
      },
      amount: {
        kind: 'unit-count',
        filter: {
          controller: 'friendly',
          trait: 'Droid',
        },
      },
    },
  ],
  resourcePaymentTraits: ['Droid'],
} as const satisfies UnitDefinition;
