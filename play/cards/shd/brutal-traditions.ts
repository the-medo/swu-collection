import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBrutalTraditions = {
  cardId: 'brutal-traditions',
  name: 'Brutal Traditions',
  kind: 'upgrade',
  aspects: ['Villainy', 'Vigilance'],
  traits: ['Learned'],
  cost: 2,
  token: false,
  modifiers: {
    power: 1,
    hp: 2,
  },
  attachTo: 'unit',
  actions: [
    {
      id: 'action',
      costs: [],
      limit: null,
      effects: [
        {
          kind: 'play-card',
          from: 'discard',
          filter: {
            kind: 'upgrade',
          },
          optional: false,
          target: 'source',
        },
      ],
      zone: 'discard',
      requiresPlayable: true,
      condition: {
        kind: 'unit-history-at-least',
        event: 'defeated',
        player: 'enemy',
        amount: 1,
      },
    },
  ],
} as const satisfies UpgradeDefinition;
