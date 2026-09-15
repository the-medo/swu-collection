import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-conversions.json.
export const deathStarPlans = {
  cardId: 'death-star-plans',
  name: 'Death Star Plans',
  kind: 'upgrade',
  aspects: [],
  traits: ['Item'],
  cost: 2,
  token: false,
  modifiers: {
    power: 0,
    hp: 0,
  },
  attachTo: 'unit',
  triggers: [
    {
      id: 'steal-plans',
      timing: 'host-attacked',
      effects: [
        {
          kind: 'take-control-upgrade',
          target: 'source',
          player: 'attacker',
        },
        {
          kind: 'reattach-upgrade',
          target: 'source',
          chooser: 'controller',
          filter: {
            controller: 'friendly',
          },
        },
      ],
    },
  ],
  grants: {
    playReductions: [
      {
        id: 'first-unit',
        filter: {
          kind: 'unit',
        },
        amount: 2,
        firstEachRound: true,
      },
    ],
  },
} as const satisfies UpgradeDefinition;
