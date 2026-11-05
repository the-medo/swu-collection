import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteObiWanSAetherspriteThisIsWhyIHateFlying = {
  cardId: 'obi-wan-s-aethersprite--this-is-why-i-hate-flying',
  name: "Obi-Wan's Aethersprite, This is Why I Hate Flying",
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Jedi', 'Republic', 'Vehicle', 'Fighter'],
  cost: 5,
  unique: true,
  power: 4,
  hp: 6,
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
              id: 'resolve',
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    arena: 'space',
                    otherThan: 'source',
                  },
                  optional: false,
                  bind: 'chosen',
                  effects: [
                    {
                      kind: 'damage-assignments',
                      assignments: [
                        {
                          target: 'source',
                          amount: 1,
                        },
                        {
                          target: 'chosen',
                          amount: 2,
                        },
                      ],
                    },
                  ],
                  allowMissing: true,
                },
              ],
            },
            {
              id: 'decline',
              effects: [],
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
          kind: 'choose-mode',
          options: [
            {
              id: 'resolve',
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    arena: 'space',
                    otherThan: 'source',
                  },
                  optional: false,
                  bind: 'chosen',
                  effects: [
                    {
                      kind: 'damage-assignments',
                      assignments: [
                        {
                          target: 'source',
                          amount: 1,
                        },
                        {
                          target: 'chosen',
                          amount: 2,
                        },
                      ],
                    },
                  ],
                  allowMissing: true,
                },
              ],
            },
            {
              id: 'decline',
              effects: [],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
