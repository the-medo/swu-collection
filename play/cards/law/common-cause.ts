import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const commonCause = {
  cardId: 'common-cause',
  name: 'Common Cause',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Innate'],
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
            kind: 'modify',
            power: {
              kind: 'unit-aspects',
              filter: {
                controller: 'friendly',
              },
            },
            hp: {
              kind: 'unit-aspects',
              filter: {
                controller: 'friendly',
              },
            },
            duration: 'phase',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
