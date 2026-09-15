import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const theGhostHomeOfTheSpectres = {
  cardId: 'the-ghost--home-of-the-spectres',
  name: 'The Ghost, Home of the Spectres',
  kind: 'unit',
  aspects: ['Command', 'Cunning', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Transport', 'Spectre'],
  unique: true,
  cost: 6,
  power: 4,
  hp: 4,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'one-unit',
              effects: [
                {
                  kind: 'select-unit',
                  filter: {},
                  bind: 'chosen',
                  optional: true,
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
            {
              id: 'two-units',
              condition: {
                kind: 'units-at-least',
                filter: {
                  controller: 'friendly',
                  anyAspect: ['Vigilance', 'Aggression'],
                },
                amount: 1,
              },
              effects: [
                {
                  kind: 'select-units',
                  filter: {},
                  bind: 'targets',
                  max: 2,
                  effects: [
                    {
                      kind: 'each-unit',
                      filter: {
                        inGroup: 'targets',
                      },
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
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
