import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const inTheShadows = {
  cardId: 'in-the-shadows',
  name: 'In the Shadows',
  kind: 'event',
  aspects: ['Villainy'],
  traits: ['Plan'],
  cost: 2,
  effects: [
    {
      kind: 'select-units',
      filter: {
        controller: 'friendly',
        hasKeyword: 'Hidden',
      },
      min: 0,
      max: 3,
      bind: 'group',
      effects: [
        {
          kind: 'each-unit',
          filter: {
            inGroup: 'group',
          },
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
