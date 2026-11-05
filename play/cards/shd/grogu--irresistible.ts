import type { UnitDefinition } from '../definition.ts';

// Reprinted in IC27 154; identity and text follow the official catalog.
export const ic27ReprintGroguIrresistible = {
  cardId: 'grogu--irresistible',
  name: 'Grogu, Irresistible',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Force'],
  cost: 2,
  unique: true,
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
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'exhaust',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
