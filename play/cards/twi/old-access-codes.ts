import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteOldAccessCodes = {
  cardId: 'old-access-codes',
  name: 'Old Access Codes',
  kind: 'upgrade',
  aspects: ['Aggression'],
  traits: ['Item'],
  cost: 1,
  token: false,
  modifiers: {
    power: 1,
    hp: 0,
  },
  attachTo: 'unit',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-count-comparison',
            relation: 'less',
          },
          effects: [
            {
              kind: 'draw-cards',
              amount: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
