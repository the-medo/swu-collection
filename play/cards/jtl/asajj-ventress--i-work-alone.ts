import type { LeaderDefinition } from '../definition.ts';

// Printed roles and official clarifications are pinned in leader-combat.json.
export const asajjVentressIWorkAlone = {
  cardId: 'asajj-ventress--i-work-alone',
  name: 'Asajj Ventress, I Work Alone',
  kind: 'leader',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Force', 'Night', 'Bounty Hunter', 'Pilot'],
  unique: true,
  printedCost: 6,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
              },
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'damage',
                    amount: 1,
                  },
                  ifYouDo: [
                    {
                      kind: 'select-unit',
                      filter: {
                        controller: 'enemy',
                        sameArenaAs: 'chosen',
                      },
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'enemy',
                          operation: {
                            kind: 'damage',
                            amount: 1,
                          },
                        },
                      ],
                      optional: false,
                      bind: 'enemy',
                    },
                  ],
                },
              ],
              optional: false,
              bind: 'chosen',
            },
          ],
        },
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              as: 'unit-or-upgrade',
              condition: {
                kind: 'resources-at-least',
                amount: 6,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 6,
      arena: 'ground',
      keywords: ['Grit'],
    },
    upgrade: {
      modifiers: {
        power: 3,
        hp: 4,
      },
      attachTo: 'friendly-vehicle-without-pilot',
      hostIsLeader: true,
      grants: {
        keywords: ['Grit'],
        triggers: [
          {
            id: 'attack',
            timing: 'attack',
            effects: [
              {
                kind: 'select-unit',
                filter: {
                  controller: 'friendly',
                },
                effects: [
                  {
                    kind: 'on-unit',
                    target: 'chosen',
                    operation: {
                      kind: 'damage',
                      amount: 1,
                    },
                    ifYouDo: [
                      {
                        kind: 'select-unit',
                        filter: {
                          controller: 'enemy',
                          sameArenaAs: 'chosen',
                        },
                        effects: [
                          {
                            kind: 'on-unit',
                            target: 'enemy',
                            operation: {
                              kind: 'damage',
                              amount: 1,
                            },
                          },
                        ],
                        optional: false,
                        bind: 'enemy',
                      },
                    ],
                  },
                ],
                optional: true,
                bind: 'chosen',
              },
            ],
          },
        ],
      },
    },
  },
} as const satisfies LeaderDefinition;
