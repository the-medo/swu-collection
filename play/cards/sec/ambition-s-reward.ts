import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const ambitionSReward = {
  cardId: 'ambition-s-reward',
  name: "Ambition's Reward",
  kind: 'upgrade',
  aspects: ['Aggression'],
  traits: ['Law'],
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
          kind: 'create-unit',
          cardId: 'spy',
          count: 1,
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
