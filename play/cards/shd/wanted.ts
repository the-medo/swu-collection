import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteWanted = {
  cardId: 'wanted',
  name: 'Wanted',
  kind: 'upgrade',
  aspects: ['Cunning'],
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
            kind: 'select-resources',
            player: 'self',
            exhausted: 'any',
            min: 2,
            max: 2,
            operation: 'ready',
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
