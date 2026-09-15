import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const langArrogantMercenary = {
  cardId: 'lang--arrogant-mercenary',
  name: 'Lang, Arrogant Mercenary',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Fringe'],
  unique: true,
  cost: 3,
  power: 2,
  hp: 5,
  arena: 'ground',
  actions: [
    {
      id: 'shoot',
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
            arena: 'ground',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: {
                  kind: 'unit-stat',
                  target: 'source',
                  stat: 'power',
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
