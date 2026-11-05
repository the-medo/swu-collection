import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteKyloRenKillingThePast = {
  cardId: 'kylo-ren--killing-the-past',
  name: 'Kylo Ren, Killing the Past',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Force', 'First Order'],
  cost: 6,
  unique: true,
  power: 6,
  hp: 7,
  arena: 'ground',
  ownPlayAspectExceptions: [
    {
      aspects: ['Villainy'],
      condition: {
        kind: 'controls-name',
        name: 'Rey',
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
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 2,
                hp: 0,
                duration: 'phase',
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
                    aspect: 'Villainy',
                  },
                },
              },
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
} as const satisfies UnitDefinition;
