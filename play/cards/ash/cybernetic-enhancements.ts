import type { UpgradeDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const cyberneticEnhancements = {
  cardId: 'cybernetic-enhancements',
  name: 'Cybernetic Enhancements',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Modification'],
  cost: 3,
  token: false,
  modifiers: {
    power: 2,
    hp: 2,
  },
  attachTo: 'unit',
  triggers: [
    {
      id: 'draw',
      timing: 'played',
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
