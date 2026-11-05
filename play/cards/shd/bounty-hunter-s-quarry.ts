import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBountyHunterSQuarry = {
  cardId: 'bounty-hunter-s-quarry',
  name: "Bounty Hunter's Quarry",
  kind: 'upgrade',
  aspects: ['Command'],
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
            count: {
              kind: 'conditional',
              condition: {
                kind: 'card-matches',
                target: 'source',
                filter: {
                  unique: true,
                },
              },
              then: 10,
              otherwise: 5,
            },
            max: 1,
            filter: 'unit',
            cardFilter: {
              maxCost: 3,
            },
            play: {
              discount: 0,
              free: true,
            },
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
