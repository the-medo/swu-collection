import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const mayorSMajordomoNoProblemGroveling = {
  cardId: 'mayor-s-majordomo--no-problem-groveling',
  name: "Mayor's Majordomo, No Problem Groveling",
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Official'],
  unique: true,
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
  actions: [
    {
      id: 'grovel',
      costs: [
        {
          kind: 'exhaust-self',
        },
        {
          kind: 'discard-hand',
          count: 1,
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          optional: false,
          bind: 'chosen',
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
