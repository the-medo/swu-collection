import type { UpgradeDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const durasteelPlating = {
  cardId: 'durasteel-plating',
  name: 'Durasteel Plating',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Armor'],
  cost: 2,
  token: false,
  modifiers: {
    power: 1,
    hp: 1,
  },
  attachTo: 'unit',
  triggers: [
    {
      id: 'shield-host',
      timing: 'played',
      effects: [
        {
          kind: 'on-unit',
          target: 'attached',
          operation: {
            kind: 'give-token',
            token: 'shield',
            count: 1,
          },
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
