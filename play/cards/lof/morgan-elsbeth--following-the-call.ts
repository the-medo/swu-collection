import type { LeaderDefinition } from '../definition.ts';

// Official face text and the declaration-time clarification are pinned in leader-shared-keywords.json.
export const morganElsbethFollowingTheCall = {
  cardId: 'morgan-elsbeth--following-the-call',
  name: 'Morgan Elsbeth, Following the Call',
  kind: 'leader',
  aspects: ['Command', 'Villainy'],
  traits: ['Force', 'Imperial', 'Night'],
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
                controller: 'friendly',
                attackedThisPhase: true,
              },
              bind: 'attacked',
              optional: false,
              effects: [
                {
                  kind: 'play-card',
                  from: 'hand',
                  filter: {
                    kind: 'unit',
                  },
                  sharesKeywordWith: 'attacked',
                  discount: 1,
                  optional: false,
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
      power: 3,
      hp: 6,
      arena: 'ground',
      triggers: [
        {
          id: 'shared-keyword',
          timing: 'attack',
          effects: [
            {
              kind: 'next-play',
              filter: {
                kind: 'unit',
              },
              discount: 1,
              discountIfSharesKeyword: true,
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
