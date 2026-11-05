import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBoldResistance = {
  cardId: 'bold-resistance',
  name: 'Bold Resistance',
  kind: 'event',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      filter: {},
      optional: true,
      bind: 'first',
      effects: [
        {
          kind: 'on-unit',
          target: 'first',
          operation: {
            kind: 'modify',
            power: 2,
            hp: 0,
            duration: 'phase',
          },
        },
        {
          kind: 'select-unit',
          filter: {
            otherThan: 'first',
            sharesTraitWith: 'first',
          },
          optional: true,
          bind: 'second',
          effects: [
            {
              kind: 'on-unit',
              target: 'second',
              operation: {
                kind: 'modify',
                power: 2,
                hp: 0,
                duration: 'phase',
              },
            },
            {
              kind: 'select-unit',
              filter: {
                otherThanAny: ['first', 'second'],
                sharesTraitsWithAll: ['first', 'second'],
              },
              optional: true,
              bind: 'third',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'third',
                  operation: {
                    kind: 'modify',
                    power: 2,
                    hp: 0,
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
