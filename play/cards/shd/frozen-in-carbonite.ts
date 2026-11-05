import type { UpgradeDefinition } from '../definition.ts';

// Reprinted in IC27 150; identity and text follow the official catalog.
export const ic27ReprintFrozenInCarbonite = {
  cardId: 'frozen-in-carbonite',
  name: 'Frozen in Carbonite',
  kind: 'upgrade',
  aspects: ['Villainy', 'Cunning'],
  traits: ['Condition'],
  cost: 3,
  token: false,
  modifiers: {
    power: 0,
    hp: 0,
  },
  attachTo: 'unit',
  attachFilter: {
    nonLeader: true,
  },
  hostCannotReady: true,
  triggers: [
    {
      id: 'played',
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
