import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTopTarget = {
  cardId: 'top-target',
  name: 'Top Target',
  kind: 'upgrade',
  aspects: ['Vigilance'],
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
            kind: 'select-target',
            units: {},
            bases: 'any',
            bind: 'chosen',
            optional: false,
            effects: [
              {
                kind: 'heal-target',
                target: 'chosen',
                amount: {
                  kind: 'conditional',
                  condition: {
                    kind: 'card-matches',
                    target: 'source',
                    filter: {
                      unique: true,
                    },
                  },
                  then: 6,
                  otherwise: 4,
                },
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
