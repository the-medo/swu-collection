import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGeneralRieekanDefensiveStrategist = {
  cardId: 'general-rieekan--defensive-strategist',
  name: 'General Rieekan, Defensive Strategist',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Official'],
  cost: 6,
  unique: true,
  power: 5,
  hp: 7,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
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
              kind: 'if',
              condition: {
                kind: 'unit-matches',
                target: 'chosen',
                filter: {
                  hasKeyword: 'Sentinel',
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
              otherwise: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: 0,
                    hp: 0,
                    duration: 'phase',
                    abilities: {
                      keywords: ['Sentinel'],
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'attack',
      timing: 'attack',
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
              kind: 'if',
              condition: {
                kind: 'unit-matches',
                target: 'chosen',
                filter: {
                  hasKeyword: 'Sentinel',
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
              otherwise: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: 0,
                    hp: 0,
                    duration: 'phase',
                    abilities: {
                      keywords: ['Sentinel'],
                    },
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
