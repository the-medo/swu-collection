import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteIndependentSenator = {
  cardId: 'independent-senator',
  name: 'Independent Senator',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Separatist', 'Official'],
  cost: 1,
  power: 0,
  hp: 4,
  arena: 'ground',
  actions: [
    {
      id: 'action',
      costs: [
        {
          kind: 'resources',
          amount: 2,
        },
        {
          kind: 'exhaust-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'select-unit',
          filter: {
            powerAtMost: 4,
          },
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
