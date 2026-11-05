import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRichReward = {
  cardId: 'rich-reward',
  name: 'Rich Reward',
  kind: 'upgrade',
  aspects: [],
  traits: ['Bounty', 'Condition'],
  cost: 1,
  token: false,
  modifiers: {
    power: 0,
    hp: 0,
  },
  attachTo: 'unit',
  grants: {
    bounties: [
      {
        id: 'bounty',
        effects: [
          {
            kind: 'select-units',
            filter: {},
            bind: 'chosen',
            min: 0,
            max: 2,
            effects: [
              {
                kind: 'each-unit',
                filter: {
                  inGroup: 'chosen',
                },
                bind: 'recipient',
                effects: [
                  {
                    kind: 'on-unit',
                    target: 'recipient',
                    operation: {
                      kind: 'give-token',
                      token: 'experience',
                      count: 1,
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
} as const satisfies UpgradeDefinition;
