import type { LeaderDefinition } from '../definition.ts';

// Both printed faces are pinned in leader-foundations.json.
export const ig88RuthlessBountyHunter = {
  cardId: 'ig-88--ruthless-bounty-hunter',
  name: 'IG-88, Ruthless Bounty Hunter',
  kind: 'leader',
  aspects: ['Villainy', 'Aggression'],
  traits: ['Underworld', 'Droid', 'Bounty Hunter'],
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
              kind: 'if',
              condition: {
                kind: 'more-units-than-opponent',
              },
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'friendly',
                  },
                  bind: 'chosen',
                  optional: false,
                  effects: [
                    {
                      kind: 'attack-bound',
                      target: 'chosen',
                      optional: false,
                      powerBonus: 1,
                    },
                  ],
                  forAttack: {},
                },
              ],
              otherwise: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'friendly',
                  },
                  bind: 'chosen',
                  optional: false,
                  effects: [
                    {
                      kind: 'attack-bound',
                      target: 'chosen',
                      optional: false,
                    },
                  ],
                  forAttack: {},
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
              as: 'unit',
              condition: {
                kind: 'resources-at-least',
                amount: 5,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 5,
      hp: 4,
      arena: 'ground',
      auras: [
        {
          id: 'raid',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          abilities: {
            raid: 1,
          },
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
