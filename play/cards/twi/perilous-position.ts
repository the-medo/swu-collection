import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePerilousPosition = {
  cardId: 'perilous-position',
  name: 'Perilous Position',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Condition'],
  cost: 3,
  token: false,
  modifiers: {
    power: -2,
    hp: -2,
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
            kind: 'exhaust',
          },
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
