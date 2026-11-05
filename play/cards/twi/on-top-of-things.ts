import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteOnTopOfThings = {
  cardId: 'on-top-of-things',
  name: 'On Top of Things',
  kind: 'upgrade',
  aspects: ['Cunning'],
  traits: ['Trick'],
  cost: 2,
  token: false,
  modifiers: {
    power: 2,
    hp: 0,
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
            kind: 'modify',
            power: 0,
            hp: 0,
            duration: 'phase',
            cannotBeAttacked: true,
          },
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
