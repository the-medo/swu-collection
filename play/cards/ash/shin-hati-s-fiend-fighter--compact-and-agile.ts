import type { UnitDefinition } from '../definition.ts';

// Text is pinned in meta-attack-outcomes; v8 end-of-attack timing applies.
export const shinHatiSFiendFighterCompactAndAgile = {
  cardId: 'shin-hati-s-fiend-fighter--compact-and-agile',
  name: "Shin Hati's Fiend Fighter, Compact and Agile",
  aspects: ['Cunning', 'Villainy'],
  traits: ['Vehicle', 'Fighter'],
  cost: 2,
  power: 3,
  hp: 1,
  kind: 'unit',
  arena: 'space',
  triggers: [
    {
      id: 'grant-advantage',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'value-at-least',
                name: 'defeated-by-combat',
                amount: 1,
              },
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'give-token',
                    token: 'advantage',
                    count: 2,
                  },
                },
              ],
              otherwise: [
                {
                  kind: 'choose-mode',
                  options: [
                    {
                      id: 'give-two',
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'give-token',
                            token: 'advantage',
                            count: 2,
                          },
                        },
                      ],
                    },
                    {
                      id: 'give-three',
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'give-token',
                            token: 'advantage',
                            count: 3,
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
    },
  ],
  unique: true,
} as const satisfies UnitDefinition;
