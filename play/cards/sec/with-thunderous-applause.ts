import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const withThunderousApplause = {
  cardId: 'with-thunderous-applause',
  name: 'With Thunderous Applause',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Plan'],
  cost: 3,
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
        {
          kind: 'disclose',
          aspects: ['Command'],
          effects: [
            {
              kind: 'select-unit',
              filter: {
                otherThan: 'chosen',
              },
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
    },
  ],
} as const satisfies EventDefinition;
