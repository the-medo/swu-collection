import type { LeaderDefinition } from '../definition.ts';

// Both printed faces and official clarifications are pinned in leader-plays.json.
export const reyNobody = {
  cardId: 'rey--nobody',
  name: 'Rey, Nobody',
  kind: 'leader',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Force', 'Resistance'],
  unique: true,
  printedCost: 7,
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
              kind: 'if',
              condition: {
                kind: 'played-card-this-phase',
                filter: {
                  notKind: 'unit',
                  trait: 'Force',
                },
              },
              effects: [
                {
                  kind: 'select-unit',
                  filter: {},
                  bind: 'chosen',
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'damage',
                        amount: 1,
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
                amount: 7,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 6,
      hp: 8,
      arena: 'ground',
      triggers: [
        {
          id: 'deployed',
          timing: 'deployed',
          effects: [
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'use-ability',
                  effects: [
                    {
                      kind: 'inspect-zone',
                      zone: 'hand',
                      player: 'self',
                      chooser: 'self',
                      filter: {},
                      min: {
                        kind: 'zone-size',
                        zone: 'hand',
                        player: 'self',
                      },
                      max: {
                        kind: 'zone-size',
                        zone: 'hand',
                        player: 'self',
                      },
                      bind: 'card',
                      group: 'hand',
                      effects: [
                        {
                          kind: 'move-cards',
                          group: 'hand',
                          from: 'hand',
                          to: 'discard',
                        },
                      ],
                      after: [
                        {
                          kind: 'draw-cards',
                          amount: 2,
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
