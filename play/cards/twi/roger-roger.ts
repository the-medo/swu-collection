import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRogerRoger = {
  cardId: 'roger-roger',
  name: 'Roger Roger',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Learned'],
  cost: 1,
  token: false,
  modifiers: {
    power: 1,
    hp: 1,
  },
  attachTo: 'unit',
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'reattach-upgrade',
          target: 'source',
          fromDiscard: true,
          filter: {
            controller: 'friendly',
            token: true,
            name: 'Battle Droid',
          },
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
