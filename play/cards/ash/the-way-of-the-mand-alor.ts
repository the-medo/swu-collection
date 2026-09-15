import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-advanced.json.
export const theWayOfTheMandAlor = {
  cardId: 'the-way-of-the-mand-alor',
  name: "The Way of the Mand'alor",
  kind: 'upgrade',
  aspects: [],
  traits: ['Mandalorian'],
  cost: 2,
  token: false,
  modifiers: {
    power: 2,
    hp: 0,
  },
  attachTo: 'unit',
  hostDiscounts: [
    {
      filter: {
        trait: 'Mandalorian',
      },
      amount: 1,
    },
  ],
} as const satisfies UpgradeDefinition;
