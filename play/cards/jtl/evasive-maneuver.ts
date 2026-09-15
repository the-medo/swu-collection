import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const evasiveManeuver = {
  cardId: 'evasive-maneuver',
  name: 'Evasive Maneuver',
  kind: 'event',
  aspects: [],
  traits: ['Trick'],
  cost: 2,
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
} as const satisfies EventDefinition;
