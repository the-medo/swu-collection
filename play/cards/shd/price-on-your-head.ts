import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePriceOnYourHead = {
  cardId: 'price-on-your-head',
  name: 'Price on Your Head',
  kind: 'upgrade',
  aspects: ['Command'],
  traits: ['Bounty', 'Condition'],
  cost: 2,
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
            kind: 'resource-top',
            optional: false,
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
