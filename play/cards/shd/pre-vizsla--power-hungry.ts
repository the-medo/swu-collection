import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePreVizslaPowerHungry = {
  cardId: 'pre-vizsla--power-hungry',
  name: 'Pre Vizsla, Power Hungry',
  kind: 'unit',
  aspects: ['Villainy', 'Aggression'],
  traits: ['Mandalorian', 'Trooper'],
  cost: 7,
  unique: true,
  power: 8,
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
            otherThan: 'source',
            withoutTrait: 'Vehicle',
            upgraded: true,
          },
          optional: true,
          bind: 'host',
          effects: [
            {
              kind: 'select-upgrades',
              filter: {
                attachedTo: 'host',
              },
              min: 1,
              max: 1,
              bind: 'upgrade',
              effects: [
                {
                  kind: 'pay-resources',
                  amount: {
                    kind: 'card-cost',
                    target: 'upgrade',
                  },
                  optional: true,
                  effects: [
                    {
                      kind: 'take-control-upgrade',
                      target: 'upgrade',
                    },
                    {
                      kind: 'if',
                      condition: {
                        kind: 'card-matches',
                        target: 'upgrade',
                        filter: {
                          attachesTo: 'source',
                        },
                      },
                      effects: [
                        {
                          kind: 'reattach-upgrade',
                          target: 'upgrade',
                          filter: {
                            sameAs: 'source',
                          },
                        },
                      ],
                      otherwise: [
                        {
                          kind: 'move-upgrades',
                          group: 'upgrade',
                          to: 'discard',
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
            otherThan: 'source',
            withoutTrait: 'Vehicle',
            upgraded: true,
          },
          optional: true,
          bind: 'host',
          effects: [
            {
              kind: 'select-upgrades',
              filter: {
                attachedTo: 'host',
              },
              min: 1,
              max: 1,
              bind: 'upgrade',
              effects: [
                {
                  kind: 'pay-resources',
                  amount: {
                    kind: 'card-cost',
                    target: 'upgrade',
                  },
                  optional: true,
                  effects: [
                    {
                      kind: 'take-control-upgrade',
                      target: 'upgrade',
                    },
                    {
                      kind: 'if',
                      condition: {
                        kind: 'card-matches',
                        target: 'upgrade',
                        filter: {
                          attachesTo: 'source',
                        },
                      },
                      effects: [
                        {
                          kind: 'reattach-upgrade',
                          target: 'upgrade',
                          filter: {
                            sameAs: 'source',
                          },
                        },
                      ],
                      otherwise: [
                        {
                          kind: 'move-upgrades',
                          group: 'upgrade',
                          to: 'discard',
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
