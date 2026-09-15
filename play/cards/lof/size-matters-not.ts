import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-attributes.json.
export const sizeMattersNot = {
  cardId: 'size-matters-not',
  name: 'Size Matters Not',
  kind: 'upgrade',
  aspects: ['Vigilance', 'Vigilance'],
  traits: ['Force'],
  cost: 3,
  token: false,
  modifiers: {
    power: 0,
    hp: 0,
  },
  attachTo: 'unit',
  costReductions: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          trait: 'Force',
        },
        amount: 1,
      },
      amount: 1,
    },
  ],
  printedStats: [
    {
      condition: {
        kind: 'always',
      },
      filter: {
        sameAs: 'attached',
      },
      power: 5,
      hp: 5,
    },
  ],
} as const satisfies UpgradeDefinition;
