import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGrievousSWheelBike = {
  cardId: 'grievous-s-wheel-bike',
  name: "Grievous's Wheel Bike",
  kind: 'upgrade',
  aspects: ['Villainy'],
  traits: ['Vehicle'],
  cost: 4,
  token: false,
  modifiers: {
    power: 3,
    hp: 3,
  },
  attachTo: 'non-vehicle',
  hostDiscounts: [
    {
      filter: {
        name: 'General Grievous',
      },
      amount: 2,
    },
  ],
  grants: {
    keywords: ['Overwhelm'],
  },
} as const satisfies UpgradeDefinition;
