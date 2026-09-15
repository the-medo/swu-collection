import type { LeaderDefinition } from '../definition.ts';

// Official text is pinned in leader-bounties.json.
export const bosskHuntingHisPrey = {
  cardId: 'bossk--hunting-his-prey',
  name: 'Bossk, Hunting His Prey',
  kind: 'leader',
  aspects: ['Villainy', 'Aggression'],
  traits: ['Underworld', 'Bounty Hunter'],
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
              kind: 'select-unit',
              filter: {
                hasBounty: true,
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'damage-bound',
                  targets: ['chosen'],
                  amount: 1,
                },
                {
                  kind: 'select-unit',
                  filter: {
                    sameAs: 'chosen',
                  },
                  bind: 'boost',
                  optional: true,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'boost',
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
          id: 'repeat-bounty',
          timing: 'bounty-collected',
          optional: true,
          limit: 'once-per-round',
          effects: [
            {
              kind: 'repeat-bounty',
              index: 'used-bounty',
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
