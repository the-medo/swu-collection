import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCalculatedLethality = {
  cardId: 'calculated-lethality',
  name: 'Calculated Lethality',
  kind: 'event',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Tactic'],
  cost: 4,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        nonLeader: true,
        maxCost: 3,
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'with-value',
          name: 'upgrades',
          value: {
            kind: 'upgrades-count',
            target: 'chosen',
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'defeat',
              },
            },
            {
              kind: 'repeat-effects',
              count: {
                kind: 'value',
                name: 'upgrades',
              },
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'friendly',
                  },
                  optional: false,
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
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
