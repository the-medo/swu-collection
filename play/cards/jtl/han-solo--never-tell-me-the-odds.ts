import type { LeaderDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 Pilot foundations fixture.
export const hanSoloNeverTellMeTheOdds = {
  cardId: 'han-solo--never-tell-me-the-odds',
  name: 'Han Solo, Never Tell Me the Odds',
  kind: 'leader',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Rebel', 'Pilot'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      actions: [
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
                amount: 5,
              },
            },
          ],
        },
        {
          id: 'different-odds',
          costs: [
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'reveal-top',
              player: 'self',
              bind: 'revealed',
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'friendly',
                    exhausted: false,
                  },
                  optional: false,
                  bind: 'attacker',
                  effects: [
                    {
                      kind: 'if',
                      condition: {
                        kind: 'all',
                        conditions: [
                          {
                            kind: 'card-matches',
                            target: 'revealed',
                            filter: {
                              costParity: 'odd',
                            },
                          },
                          {
                            kind: 'card-matches',
                            target: 'attacker',
                            filter: {
                              costParity: 'odd',
                            },
                          },
                          {
                            kind: 'different-costs',
                            targets: ['revealed', 'attacker'],
                          },
                        ],
                      },
                      effects: [
                        {
                          kind: 'attack-bound',
                          target: 'attacker',
                          optional: false,
                          powerBonus: 1,
                        },
                      ],
                      otherwise: [
                        {
                          kind: 'attack-bound',
                          target: 'attacker',
                          optional: false,
                        },
                      ],
                    },
                  ],
                  forAttack: {},
                  allowMissing: true,
                },
              ],
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 7,
      arena: 'ground',
    },
    upgrade: {
      modifiers: {
        power: 3,
        hp: 4,
      },
      attachTo: 'friendly-vehicle-without-pilot',
      hostIsLeader: true,
      triggers: [
        {
          id: 'odd-resources',
          timing: 'deployed',
          effects: [
            {
              kind: 'with-value',
              name: 'odd-count',
              value: {
                kind: 'cards-in-play-count',
                filter: { controller: 'friendly', roles: ['unit', 'upgrade'], costParity: 'odd' },
              },
              effects: [
                {
                  kind: 'if',
                  condition: { kind: 'value-at-least', name: 'odd-count', amount: 1 },
                  effects: [
                    {
                      kind: 'select-resources',
                      player: 'self',
                      exhausted: 'any',
                      min: 1,
                      max: { kind: 'value', name: 'odd-count' },
                      operation: 'ready',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
