import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const fullOfSurprises = {
  cardId: 'full-of-surprises',
  name: 'Full of Surprises',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Trick'],
  cost: 2,
  effects: [
    {
      kind: 'select-upgrades',
      filter: {
        maxCost: 2,
      },
      min: 1,
      max: 1,
      bind: 'upgrade',
      effects: [
        {
          kind: 'move-upgrades',
          group: 'upgrade',
          to: 'hand',
        },
      ],
    },
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
            kind: 'give-token',
            token: 'shield',
            count: 1,
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
