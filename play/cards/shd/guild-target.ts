import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGuildTarget = {
  cardId: 'guild-target',
  name: 'Guild Target',
  kind: 'upgrade',
  aspects: ['Aggression'],
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
            kind: 'select-target',
            bases: 'any',
            bind: 'chosen',
            optional: false,
            effects: [
              {
                kind: 'damage-target',
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
                  then: 3,
                  otherwise: 2,
                },
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
