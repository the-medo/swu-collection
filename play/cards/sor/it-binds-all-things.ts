import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteItBindsAllThings = {
  cardId: 'it-binds-all-things',
  name: 'It Binds All Things',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Force'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {},
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'distribute',
          benefit: 'heal',
          amount: 3,
          filter: {
            sameAs: 'chosen',
          },
          bind: 'healed',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'units-at-least',
                filter: {
                  controller: 'friendly',
                  trait: 'Force',
                },
                amount: 1,
              },
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    otherThan: 'chosen',
                  },
                  optional: true,
                  bind: 'chosen',
                  effects: [
                    {
                      kind: 'damage-target',
                      target: 'chosen',
                      amount: {
                        kind: 'value',
                        name: 'healed',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
