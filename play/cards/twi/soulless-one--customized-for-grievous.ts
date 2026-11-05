import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSoullessOneCustomizedForGrievous = {
  cardId: 'soulless-one--customized-for-grievous',
  name: 'Soulless One, Customized for Grievous',
  kind: 'unit',
  aspects: ['Villainy', 'Cunning'],
  traits: ['Separatist', 'Vehicle', 'Fighter'],
  cost: 1,
  unique: true,
  power: 1,
  hp: 2,
  arena: 'space',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'unit',
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'friendly',
                    exhausted: false,
                    anyOf: [
                      {
                        trait: 'Droid',
                      },
                      {
                        name: 'General Grievous',
                      },
                    ],
                  },
                  optional: false,
                  bind: 'chosen',
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'exhaust',
                      },
                      ifYouDo: [
                        {
                          kind: 'on-unit',
                          target: 'source',
                          operation: {
                            kind: 'modify',
                            power: 2,
                            hp: 0,
                            duration: 'attack',
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              id: 'leader',
              effects: [
                {
                  kind: 'exhaust-leader',
                  filter: {
                    name: 'General Grievous',
                  },
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'source',
                      operation: {
                        kind: 'modify',
                        power: 2,
                        hp: 0,
                        duration: 'attack',
                      },
                    },
                  ],
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
