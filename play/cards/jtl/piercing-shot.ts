import type { EventDefinition } from '../definition.ts';

// JTL . Printed text is pinned in the meta effects fixture.
export const piercingShot = {
  cardId: 'piercing-shot',
  name: 'Piercing Shot',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Tactic'],
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
            kind: 'defeat-shields',
          },
        },
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'damage',
            amount: 3,
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
