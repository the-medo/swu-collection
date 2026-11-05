import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMaximumFirepower = {
  cardId: 'maximum-firepower',
  name: 'Maximum Firepower',
  kind: 'event',
  aspects: ['Villainy'],
  traits: ['Imperial', 'Tactic'],
  cost: 4,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
        trait: 'Imperial',
      },
      optional: false,
      bind: 'first',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          optional: false,
          bind: 'victim',
          effects: [
            {
              kind: 'damage-target',
              target: 'victim',
              amount: {
                kind: 'unit-stat',
                target: 'first',
                stat: 'power',
              },
              source: 'first',
            },
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
                trait: 'Imperial',
                otherThan: 'first',
              },
              optional: false,
              bind: 'second',
              effects: [
                {
                  kind: 'damage-target',
                  target: 'victim',
                  amount: {
                    kind: 'unit-stat',
                    target: 'second',
                    stat: 'power',
                  },
                  source: 'second',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
