import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteForTheRepublic = {
  cardId: 'for-the-republic',
  name: 'For The Republic',
  kind: 'upgrade',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Republic'],
  cost: 3,
  token: false,
  modifiers: {
    power: 2,
    hp: 2,
  },
  attachTo: 'unit',
  costReductions: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          trait: 'Republic',
        },
        amount: 3,
      },
      amount: 2,
    },
  ],
  grants: {
    keywords: ['Coordinate'],
    constant: [
      {
        condition: {
          kind: 'units-at-least',
          filter: {
            controller: 'friendly',
          },
          amount: 3,
        },
        restore: 2,
      },
    ],
  },
} as const satisfies UpgradeDefinition;
