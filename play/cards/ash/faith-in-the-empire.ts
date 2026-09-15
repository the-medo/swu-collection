import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-advanced.json.
export const faithInTheEmpire = {
  cardId: 'faith-in-the-empire',
  name: 'Faith in the Empire',
  kind: 'upgrade',
  aspects: [],
  traits: ['Imperial'],
  cost: 2,
  token: false,
  modifiers: {
    power: 1,
    hp: 2,
  },
  attachTo: 'unit',
  hostDiscounts: [
    {
      filter: {
        trait: 'Imperial',
      },
      amount: 1,
    },
  ],
} as const satisfies UpgradeDefinition;
