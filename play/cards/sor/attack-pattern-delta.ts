import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAttackPatternDelta = {
  cardId: 'attack-pattern-delta',
  name: 'Attack Pattern Delta',
  kind: 'event',
  aspects: ['Command', 'Command'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      optional: false,
      bind: 'first',
      effects: [
        {
          kind: 'on-unit',
          target: 'first',
          operation: {
            kind: 'modify',
            power: 3,
            hp: 3,
            duration: 'phase',
          },
        },
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'first',
          },
          optional: false,
          bind: 'second',
          effects: [
            {
              kind: 'on-unit',
              target: 'second',
              operation: {
                kind: 'modify',
                power: 2,
                hp: 2,
                duration: 'phase',
              },
            },
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
                otherThanAny: ['first', 'second'],
              },
              optional: false,
              bind: 'third',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'third',
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
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
