import type { UpgradeDefinition } from '../definition.ts';

// LAW . Printed text is pinned in the meta effects fixture.
export const killSwitch = {
  cardId: 'kill-switch',
  name: 'Kill Switch',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Condition'],
  cost: 2,
  token: false,
  modifiers: {
    power: -1,
    hp: -1,
  },
  attachTo: 'unit',
  triggers: [
    {
      id: 'on-played',
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
