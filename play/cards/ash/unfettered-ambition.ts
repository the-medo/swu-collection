import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-advanced.json.
export const unfetteredAmbition = {
  cardId: 'unfettered-ambition',
  name: 'Unfettered Ambition',
  kind: 'upgrade',
  aspects: ['Aggression'],
  traits: ['Innate'],
  cost: 2,
  token: false,
  modifiers: {
    power: 1,
    hp: 1,
  },
  attachTo: 'unit',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'on-unit',
          target: 'attached',
          operation: {
            kind: 'give-token',
            token: 'advantage',
            count: {
              kind: 'upgrades-count',
              target: 'attached',
              notCardId: 'advantage',
            },
          },
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
