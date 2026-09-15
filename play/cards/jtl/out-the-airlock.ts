import type { EventDefinition } from '../definition.ts';

// JTL . Printed text is pinned in the meta effects fixture.
export const outTheAirlock = {
  cardId: 'out-the-airlock',
  name: 'Out the Airlock',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Tactic'],
  cost: 5,
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
            power: -5,
            hp: -5,
            duration: 'phase',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
