import type { EventDefinition } from '../definition.ts';

// SEC . Printed text is pinned in the meta effects fixture.
export const knowledgeAndDefense = {
  cardId: 'knowledge-and-defense',
  name: 'Knowledge and Defense',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Learned'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      bind: 'chosen',
      filter: {},
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'modify',
            power: -2,
            hp: -2,
            duration: 'phase',
          },
        },
      ],
    },
    {
      kind: 'draw-cards',
      amount: 1,
    },
  ],
} as const satisfies EventDefinition;
