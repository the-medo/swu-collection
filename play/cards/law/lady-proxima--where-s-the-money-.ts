import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const ladyProximaWhereSTheMoney = {
  cardId: 'lady-proxima--where-s-the-money-',
  name: "Lady Proxima, Where's the Money?",
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld'],
  unique: true,
  cost: 3,
  power: 1,
  hp: 5,
  arena: 'ground',
  actions: [
    {
      id: 'create-credit',
      costs: [
        {
          kind: 'exhaust-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'create-credits',
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
