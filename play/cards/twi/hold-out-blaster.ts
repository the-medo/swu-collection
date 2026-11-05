import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteHoldOutBlaster = {
  cardId: 'hold-out-blaster',
  name: 'Hold-Out Blaster',
  kind: 'upgrade',
  aspects: [],
  traits: ['Item', 'Weapon'],
  cost: 1,
  token: false,
  modifiers: {
    power: 1,
    hp: 0,
  },
  attachTo: 'non-vehicle',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            arena: 'ground',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: 1,
              source: 'attached',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
