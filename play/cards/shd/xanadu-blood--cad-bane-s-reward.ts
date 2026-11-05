import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteXanaduBloodCadBaneSReward = {
  cardId: 'xanadu-blood--cad-bane-s-reward',
  name: "Xanadu Blood, Cad Bane's Reward",
  kind: 'unit',
  aspects: ['Villainy', 'Cunning'],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  cost: 6,
  unique: true,
  power: 4,
  hp: 6,
  arena: 'space',
  raid: 2,
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            nonLeader: true,
            trait: 'Underworld',
            otherThan: 'source',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'return-to-hand',
              },
              ifYouDo: [
                {
                  kind: 'choose-mode',
                  options: [
                    {
                      id: 'unit',
                      effects: [
                        {
                          kind: 'select-unit',
                          filter: {
                            controller: 'enemy',
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
                            },
                          ],
                        },
                      ],
                    },
                    {
                      id: 'resource',
                      effects: [
                        {
                          kind: 'select-resources',
                          player: 'enemy',
                          exhausted: false,
                          min: 1,
                          max: 1,
                          operation: 'exhaust',
                          chooser: 'self',
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
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            nonLeader: true,
            trait: 'Underworld',
            otherThan: 'source',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'return-to-hand',
              },
              ifYouDo: [
                {
                  kind: 'choose-mode',
                  options: [
                    {
                      id: 'unit',
                      effects: [
                        {
                          kind: 'select-unit',
                          filter: {
                            controller: 'enemy',
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
                            },
                          ],
                        },
                      ],
                    },
                    {
                      id: 'resource',
                      effects: [
                        {
                          kind: 'select-resources',
                          player: 'enemy',
                          exhausted: false,
                          min: 1,
                          max: 1,
                          operation: 'exhaust',
                          chooser: 'self',
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
