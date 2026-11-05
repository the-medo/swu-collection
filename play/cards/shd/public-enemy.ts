import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePublicEnemy = {
  cardId: 'public-enemy',
  name: 'Public Enemy',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Bounty', 'Condition'],
  cost: 0,
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
            kind: 'select-unit',
            filter: {},
            optional: false,
            bind: 'chosen',
            effects: [
              {
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'give-token',
                  token: 'shield',
                  count: 1,
                },
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
