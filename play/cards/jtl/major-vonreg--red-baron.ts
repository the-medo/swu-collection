import type { LeaderDefinition } from '../definition.ts';

// Both printed faces and official clarifications are pinned in leader-plays.json.
export const majorVonregRedBaron = {
  cardId: 'major-vonreg--red-baron',
  name: 'Major Vonreg, Red Baron',
  kind: 'leader',
  aspects: ['Aggression', 'Villainy'],
  traits: ['First Order', 'Pilot'],
  unique: true,
  printedCost: 4,
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
              kind: 'play-card',
              from: 'hand',
              filter: {
                kind: 'unit',
                trait: 'Vehicle',
              },
              optional: false,
              bind: 'played',
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    otherThan: 'played',
                  },
                  bind: 'chosen',
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'modify',
                        power: 1,
                        hp: 0,
                        duration: 'phase',
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
                amount: 4,
              },
              as: 'unit-or-upgrade',
            },
          ],
        },
      ],
    },
    unit: {
      power: 2,
      hp: 5,
      arena: 'ground',
    },
    upgrade: {
      modifiers: {
        power: 3,
        hp: 3,
      },
      attachTo: 'friendly-vehicle-without-pilot',
      hostIsLeader: true,
      grants: {
        triggers: [
          {
            id: 'attack',
            timing: 'attack',
            effects: [
              {
                kind: 'select-unit',
                filter: {
                  otherThan: 'source',
                  sameArenaAs: 'source',
                },
                bind: 'chosen',
                optional: true,
                effects: [
                  {
                    kind: 'on-unit',
                    target: 'chosen',
                    operation: {
                      kind: 'modify',
                      power: 1,
                      hp: 0,
                      duration: 'phase',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  },
} as const satisfies LeaderDefinition;
