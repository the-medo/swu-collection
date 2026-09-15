import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const corporateWarmongering = {
  cardId: 'corporate-warmongering',
  name: 'Corporate Warmongering',
  kind: 'event',
  aspects: ['Command', 'Villainy'],
  traits: ['Plan'],
  cost: 4,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'modify',
            power: 3,
            hp: 3,
            duration: 'phase',
          },
        },
        {
          kind: 'modify-units',
          filter: {
            controller: 'friendly',
            otherThan: 'chosen',
          },
          operation: {
            kind: 'modify',
            power: 1,
            hp: 1,
            duration: 'phase',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
