import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteJetpack = {
  cardId: 'jetpack',
  name: 'Jetpack',
  kind: 'upgrade',
  aspects: ['Cunning'],
  traits: ['Item', 'Armor'],
  cost: 2,
  token: false,
  modifiers: {
    power: 2,
    hp: 0,
  },
  attachTo: 'non-vehicle',
  smuggle: [
    {
      id: 'smuggle',
      cost: 4,
      aspects: ['Cunning'],
    },
  ],
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
            token: 'shield',
            count: 1,
            group: 'shields',
          },
          ifYouDo: [
            {
              kind: 'each-bound-card',
              group: 'shields',
              bind: 'token',
              effects: [
                {
                  kind: 'schedule-regroup-operation',
                  target: 'token',
                  operation: 'defeat',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
