import type { UpgradeDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const preparation = {
  cardId: 'preparation',
  name: 'Preparation',
  kind: 'upgrade',
  aspects: ['Cunning'],
  traits: ['Plan'],
  cost: 1,
  token: false,
  modifiers: {
    power: 2,
    hp: 1,
  },
  attachTo: 'unit',
  triggers: [
    {
      id: 'exhaust-host',
      timing: 'played',
      effects: [
        {
          kind: 'on-unit',
          target: 'attached',
          operation: {
            kind: 'exhaust',
          },
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
