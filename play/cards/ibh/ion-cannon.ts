import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const ionCannon = {
  cardId: 'ion-cannon',
  name: 'Ion Cannon',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Weapon'],
  cost: 4,
  power: 0,
  hp: 5,
  arena: 'ground',
  actions: [
    {
      id: 'action',
      costs: [
        {
          kind: 'exhaust-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'damage-unit',
          arena: 'space',
          amount: 3,
          optional: false,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
