import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-passives.json.
export const vigilSecuringTheFuture = {
  cardId: 'vigil--securing-the-future',
  name: 'Vigil, Securing the Future',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Resistance', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 7,
  power: 5,
  hp: 9,
  arena: 'space',
  keywords: ['Plot'],
  damageReplacements: [
    {
      id: 'prevent-friendly',
      target: 'other-friendly',
      operation: 'prevent',
      amount: 1,
    },
    {
      id: 'increase-self',
      target: 'self',
      operation: 'increase',
      amount: 1,
      otherSourceOnly: true,
    },
  ],
} as const satisfies UnitDefinition;
