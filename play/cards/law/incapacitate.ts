import type { EventDefinition } from '../definition.ts';

// LAW . Printed text is pinned in the meta effects fixture.
export const incapacitate = {
  cardId: 'incapacitate',
  name: 'Incapacitate',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Tactic'],
  cost: 2,
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
  ],
} as const satisfies EventDefinition;
