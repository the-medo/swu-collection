import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTraitorous = {
  cardId: 'traitorous',
  name: 'Traitorous',
  kind: 'upgrade',
  aspects: ['Command'],
  traits: ['Innate'],
  cost: 5,
  token: false,
  modifiers: {
    power: 0,
    hp: 0,
  },
  attachTo: 'unit',
  triggers: [
    {
      id: 'attached',
      timing: 'attached',
      effects: [
        {
          kind: 'on-unit',
          target: 'subject',
          operation: {
            kind: 'take-control',
            player: 'self',
          },
        },
      ],
      condition: {
        kind: 'unit-matches',
        target: 'subject',
        filter: {
          nonLeader: true,
          maxCost: 3,
        },
      },
    },
    {
      id: 'detached',
      timing: 'detached',
      effects: [
        {
          kind: 'on-unit',
          target: 'subject',
          operation: {
            kind: 'take-control',
            player: 'owner',
          },
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
