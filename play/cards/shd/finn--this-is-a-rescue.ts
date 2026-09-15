import type { LeaderDefinition } from '../definition.ts';

// Both printed faces and official clarifications are pinned in leader-plays.json.
export const finnThisIsARescue = {
  cardId: 'finn--this-is-a-rescue',
  name: 'Finn, This is a Rescue',
  kind: 'leader',
  aspects: ['Heroism', 'Vigilance'],
  traits: ['Fringe', 'Trooper'],
  unique: true,
  printedCost: 5,
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
              kind: 'select-upgrades',
              filter: {
                controller: 'friendly',
              },
              min: 1,
              max: 1,
              bind: 'upgrade',
              effects: [
                {
                  kind: 'move-upgrades',
                  group: 'upgrade',
                  to: 'discard',
                  bindHost: 'host',
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'host',
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
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              condition: {
                kind: 'resources-at-least',
                amount: 5,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 6,
      arena: 'ground',
      triggers: [
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'use-ability',
                  effects: [
                    {
                      kind: 'select-upgrades',
                      filter: {
                        controller: 'friendly',
                      },
                      min: 1,
                      max: 1,
                      bind: 'upgrade',
                      effects: [
                        {
                          kind: 'move-upgrades',
                          group: 'upgrade',
                          to: 'discard',
                          bindHost: 'host',
                          effects: [
                            {
                              kind: 'on-unit',
                              target: 'host',
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
                {
                  id: 'decline-ability',
                  effects: [],
                },
              ],
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
