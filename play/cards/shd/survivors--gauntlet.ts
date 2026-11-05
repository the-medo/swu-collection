import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSurvivorsGauntlet = {
  cardId: 'survivors--gauntlet',
  name: "Survivors' Gauntlet",
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Mandalorian', 'Vehicle', 'Transport'],
  cost: 5,
  power: 4,
  hp: 6,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
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
                  kind: 'if',
                  condition: {
                    kind: 'unit-matches',
                    target: 'host',
                    filter: {
                      controller: 'friendly',
                    },
                  },
                  effects: [
                    {
                      kind: 'reattach-upgrade',
                      target: 'upgrade',
                      filter: {
                        controller: 'friendly',
                      },
                    },
                  ],
                  otherwise: [
                    {
                      kind: 'reattach-upgrade',
                      target: 'upgrade',
                      filter: {
                        controller: 'enemy',
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
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
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
                  kind: 'if',
                  condition: {
                    kind: 'unit-matches',
                    target: 'host',
                    filter: {
                      controller: 'friendly',
                    },
                  },
                  effects: [
                    {
                      kind: 'reattach-upgrade',
                      target: 'upgrade',
                      filter: {
                        controller: 'friendly',
                      },
                    },
                  ],
                  otherwise: [
                    {
                      kind: 'reattach-upgrade',
                      target: 'upgrade',
                      filter: {
                        controller: 'enemy',
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
} as const satisfies UnitDefinition;
