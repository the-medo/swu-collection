import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteEnticingReward = {
  cardId: 'enticing-reward',
  name: 'Enticing Reward',
  kind: 'upgrade',
  aspects: ['Cunning'],
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
            kind: 'search-deck',
            count: 10,
            max: 2,
            filter: 'any',
            cardFilter: {
              notKind: 'unit',
            },
          },
          {
            kind: 'if',
            condition: {
              kind: 'not',
              condition: {
                kind: 'card-matches',
                target: 'source',
                filter: {
                  unique: true,
                },
              },
            },
            effects: [
              {
                kind: 'inspect-zone',
                zone: 'hand',
                player: 'self',
                chooser: 'owner',
                filter: {},
                min: 1,
                max: 1,
                bind: 'card',
                effects: [
                  {
                    kind: 'move-cards',
                    group: 'discarded-cards',
                    from: 'hand',
                    to: 'discard',
                    discardBy: 'owner',
                  },
                ],
                group: 'discarded-cards',
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
