import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const adeptOfAnger = {
  cardId: 'adept-of-anger',
  name: 'Adept of Anger',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Force', 'Fringe'],
  cost: 1,
  power: 1,
  hp: 3,
  arena: 'ground',
  actions: [
    {
      id: 'exhaust-unit',
      costs: [
        {
          kind: 'exhaust-self',
        },
        {
          kind: 'force',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'select-unit',
          filter: {},
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
