import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteReyKeepingThePast = {
  cardId: 'rey--keeping-the-past',
  name: 'Rey, Keeping the Past',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Force', 'Resistance'],
  cost: 5,
  unique: true,
  power: 4,
  hp: 7,
  arena: 'ground',
  ownPlayAspectExceptions: [
    {
      aspects: ['Heroism'],
      condition: {
        kind: 'controls-name',
        name: 'Kylo Ren',
      },
    },
  ],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'heal',
                amount: 2,
              },
            },
            {
              kind: 'if',
              condition: {
                kind: 'not',
                condition: {
                  kind: 'card-matches',
                  target: 'chosen',
                  filter: {
                    aspect: 'Heroism',
                  },
                },
              },
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'give-token',
                    token: 'shield',
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
} as const satisfies UnitDefinition;
