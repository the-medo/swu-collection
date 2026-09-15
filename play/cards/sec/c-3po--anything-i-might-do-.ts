import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const c3poAnythingIMightDo = {
  cardId: 'c-3po--anything-i-might-do-',
  name: 'C-3PO, Anything I Might Do?',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Republic', 'Droid'],
  unique: true,
  cost: 1,
  power: 1,
  hp: 3,
  arena: 'ground',
  actions: [
    {
      id: 'lend-a-hand',
      costs: [
        {
          kind: 'exhaust-self',
        },
        {
          kind: 'return-friendly-unit',
          filter: {
            sameAs: 'source',
          },
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
                kind: 'modify',
                power: 2,
                hp: 2,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
