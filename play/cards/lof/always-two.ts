import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const alwaysTwo = {
  cardId: 'always-two',
  name: 'Always Two',
  kind: 'event',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Sith'],
  cost: 4,
  effects: [
    {
      kind: 'select-units',
      filter: {
        controller: 'friendly',
        unique: true,
        trait: 'Sith',
      },
      min: 2,
      max: 2,
      bind: 'chosen-sith',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'numeric-equal',
            left: {
              kind: 'group-size',
              group: 'chosen-sith',
            },
            right: 2,
          },
          effects: [
            {
              kind: 'each-unit',
              filter: {
                inGroup: 'chosen-sith',
              },
              bind: 'sith',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'sith',
                  operation: {
                    kind: 'give-token',
                    token: 'shield',
                    count: 2,
                  },
                },
                {
                  kind: 'on-unit',
                  target: 'sith',
                  operation: {
                    kind: 'give-token',
                    token: 'experience',
                    count: 2,
                  },
                },
              ],
            },
          ],
        },
        {
          kind: 'defeat-units',
          filter: {
            controller: 'friendly',
            notInGroup: 'chosen-sith',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
